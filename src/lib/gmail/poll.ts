import 'server-only';
import { google, type gmail_v1 } from 'googleapis';
import { createAuthedOAuthClient } from '@/lib/google/oauth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  matchAndInsert,
  extractEmail,
  extractName,
  type ParsedInboundMessage,
  type MatchOutcome,
} from './match';

export type SkipReasons = {
  lookup_error: number;
  insert_error: number;
  parse_failed: number;
  fetch_failed: number;
};

export type FilterReasons = Record<string, number>;

export type SyncResult = {
  synced: true;
  first_run: boolean;
  mode: 'history' | 'backfill' | 'recover';
  history_id_before: string | null;
  history_id_after: string | null;
  raw_history_changes: number;
  messages_found: number;
  messages_processed: number;
  attached: number;
  unmatched: number;
  duplicates: number;
  filtered: number;
  skipped: number;
  filter_reasons: FilterReasons;
  skipped_reasons: SkipReasons;
};

const DEFAULT_BACKFILL_QUERY = 'in:inbox newer_than:1d';
const RECOVER_QUERY = 'in:inbox newer_than:7d';

function getGmail(): gmail_v1.Gmail {
  const auth = createAuthedOAuthClient();
  return google.gmail({ version: 'v1', auth });
}

function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string
): string | null {
  if (!headers) return null;
  const target = name.toLowerCase();
  const found = headers.find((h) => h.name?.toLowerCase() === target);
  return found?.value ?? null;
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf8');
}

function extractPlainText(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const found = extractPlainText(part);
      if (found) return found;
    }
  }
  if (!payload.parts && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  return '';
}

function parseMessage(msg: gmail_v1.Schema$Message): ParsedInboundMessage | null {
  if (!msg.id) return null;
  const headers = msg.payload?.headers;
  const fromHeader = getHeader(headers, 'From');
  const toHeader = getHeader(headers, 'To');
  const subject = getHeader(headers, 'Subject');
  const dateHeader = getHeader(headers, 'Date');

  const fromEmail = extractEmail(fromHeader);
  if (!fromEmail) return null;

  const fromName = extractName(fromHeader);
  const toEmail = extractEmail(toHeader) ?? '';

  let sentAt: string;
  if (dateHeader) {
    const d = new Date(dateHeader);
    sentAt = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } else if (msg.internalDate) {
    sentAt = new Date(Number(msg.internalDate)).toISOString();
  } else {
    sentAt = new Date().toISOString();
  }

  const body = extractPlainText(msg.payload).trim();

  return {
    gmail_message_id: msg.id,
    gmail_thread_id: msg.threadId ?? null,
    from_email: fromEmail,
    from_name: fromName,
    to_email: toEmail,
    subject: subject?.trim() || null,
    body,
    sent_at: sentAt,
  };
}

async function readSyncState(): Promise<{
  id: string;
  last_history_id: string | null;
}> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('gmail_sync_state')
    .select('id, last_history_id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`gmail_sync_state read failed: ${error.message}`);
  }

  if (data) return data;

  const { data: created, error: createError } = await admin
    .from('gmail_sync_state')
    .insert({ last_history_id: null })
    .select('id, last_history_id')
    .single();
  if (createError || !created) {
    throw new Error(`gmail_sync_state bootstrap failed: ${createError?.message}`);
  }
  return created;
}

async function writeSyncState(
  id: string,
  last_history_id: string
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('gmail_sync_state')
    .update({
      last_history_id,
      last_synced_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) {
    throw new Error(`gmail_sync_state write failed: ${error.message}`);
  }
}

async function listInboxIdsByQuery(
  gmail: gmail_v1.Gmail,
  q: string
): Promise<string[]> {
  const ids = new Set<string>();
  let pageToken: string | undefined;
  do {
    const res = await gmail.users.messages.list({
      userId: 'me',
      q,
      pageToken,
      maxResults: 100,
    });
    for (const m of res.data.messages ?? []) {
      if (m.id) ids.add(m.id);
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  console.log(`[gmail/poll] query "${q}" found ${ids.size} messages`);
  return Array.from(ids);
}

async function fetchAddedMessageIds(
  gmail: gmail_v1.Gmail,
  startHistoryId: string
): Promise<{
  messageIds: string[];
  latestHistoryId: string | null;
  rawHistoryChanges: number;
}> {
  const messageIds = new Set<string>();
  let latestHistoryId: string | null = null;
  let rawHistoryChanges = 0;
  let pageToken: string | undefined;

  do {
    const res = await gmail.users.history.list({
      userId: 'me',
      startHistoryId,
      historyTypes: ['messageAdded'],
      pageToken,
    });
    const data = res.data;
    if (data.historyId) latestHistoryId = data.historyId;
    rawHistoryChanges += data.history?.length ?? 0;

    for (const event of data.history ?? []) {
      for (const added of event.messagesAdded ?? []) {
        const m = added.message;
        if (!m?.id) continue;
        const labels = m.labelIds ?? [];
        if (labels.includes('DRAFT')) continue;
        if (labels.includes('SENT')) continue;
        messageIds.add(m.id);
      }
    }
    pageToken = data.nextPageToken ?? undefined;
  } while (pageToken);

  console.log(
    `[gmail/poll] history.list from ${startHistoryId}, ${rawHistoryChanges} change events, ${messageIds.size} unique message ids`
  );
  return {
    messageIds: Array.from(messageIds),
    latestHistoryId,
    rawHistoryChanges,
  };
}

type ProcessResult = {
  attached: number;
  unmatched: number;
  duplicates: number;
  filtered: number;
  skipped: number;
  filter_reasons: FilterReasons;
  skipped_reasons: SkipReasons;
};

function emptyProcessResult(): ProcessResult {
  return {
    attached: 0,
    unmatched: 0,
    duplicates: 0,
    filtered: 0,
    skipped: 0,
    filter_reasons: {},
    skipped_reasons: {
      lookup_error: 0,
      insert_error: 0,
      parse_failed: 0,
      fetch_failed: 0,
    },
  };
}

async function processIds(
  gmail: gmail_v1.Gmail,
  ids: string[]
): Promise<ProcessResult> {
  const result = emptyProcessResult();

  for (const id of ids) {
    try {
      const res = await gmail.users.messages.get({
        userId: 'me',
        id,
        format: 'full',
      });
      const parsed = parseMessage(res.data);
      if (!parsed) {
        result.skipped++;
        result.skipped_reasons.parse_failed++;
        console.log(`[gmail/poll] ${id} parse_failed (no From email)`);
        continue;
      }
      console.log(
        `[gmail/poll] ${id} from=${parsed.from_email} subject=${parsed.subject ?? '(none)'}`
      );
      const outcome: MatchOutcome = await matchAndInsert(parsed);
      if (outcome.kind === 'inserted_attached') result.attached++;
      else if (outcome.kind === 'inserted_unmatched') result.unmatched++;
      else if (outcome.kind === 'duplicate') result.duplicates++;
      else if (outcome.kind === 'filtered') {
        result.filtered++;
        const key = outcome.reason.split(':')[0];
        result.filter_reasons[key] = (result.filter_reasons[key] ?? 0) + 1;
      } else if (outcome.kind === 'skipped') {
        result.skipped++;
        if (outcome.reason === 'lookup_error')
          result.skipped_reasons.lookup_error++;
        else if (outcome.reason === 'insert_error')
          result.skipped_reasons.insert_error++;
      }
    } catch (err) {
      console.error(`[gmail/poll] message ${id} fetch_failed`, err);
      result.skipped++;
      result.skipped_reasons.fetch_failed++;
    }
  }
  return result;
}

async function runBackfill(
  gmail: gmail_v1.Gmail,
  query: string
): Promise<{ found: number } & ProcessResult> {
  const ids = await listInboxIdsByQuery(gmail, query);
  const result = await processIds(gmail, ids);
  return { found: ids.length, ...result };
}

function buildResult(
  base: {
    first_run: boolean;
    mode: SyncResult['mode'];
    history_id_before: string | null;
    history_id_after: string | null;
    raw_history_changes: number;
    found: number;
    processed: number;
  },
  process: ProcessResult
): SyncResult {
  return {
    synced: true,
    first_run: base.first_run,
    mode: base.mode,
    history_id_before: base.history_id_before,
    history_id_after: base.history_id_after,
    raw_history_changes: base.raw_history_changes,
    messages_found: base.found,
    messages_processed: base.processed,
    attached: process.attached,
    unmatched: process.unmatched,
    duplicates: process.duplicates,
    filtered: process.filtered,
    skipped: process.skipped,
    filter_reasons: process.filter_reasons,
    skipped_reasons: process.skipped_reasons,
  };
}

export async function syncGmail(opts?: {
  mode?: 'normal' | 'recover';
}): Promise<SyncResult> {
  const recover = opts?.mode === 'recover';
  const gmail = getGmail();
  const state = await readSyncState();
  const historyIdBefore = state.last_history_id;

  console.log(
    `[gmail/poll] sync starting, mode=${recover ? 'recover' : 'normal'}, watermark=${historyIdBefore ?? '(none, first run)'}`
  );

  // RECOVER: scan a 7d window through the matcher, deduped by gmail_message_id.
  // Watermark is left untouched so subsequent normal runs continue cleanly.
  if (recover) {
    const backfill = await runBackfill(gmail, RECOVER_QUERY);
    return buildResult(
      {
        first_run: false,
        mode: 'recover',
        history_id_before: historyIdBefore,
        history_id_after: historyIdBefore,
        raw_history_changes: 0,
        found: backfill.found,
        processed: backfill.found,
      },
      backfill
    );
  }

  // FIRST RUN: backfill recent inbox via time-based query, then set watermark.
  if (!historyIdBefore) {
    const backfill = await runBackfill(gmail, DEFAULT_BACKFILL_QUERY);

    const profile = await gmail.users.getProfile({ userId: 'me' });
    const historyId = profile.data.historyId;
    if (!historyId) throw new Error('Gmail profile returned no historyId.');
    await writeSyncState(state.id, historyId);
    console.log(
      `[gmail/poll] first-run complete, watermark set to ${historyId}, attached=${backfill.attached}, unmatched=${backfill.unmatched}, filtered=${backfill.filtered}`
    );

    return buildResult(
      {
        first_run: true,
        mode: 'backfill',
        history_id_before: null,
        history_id_after: historyId,
        raw_history_changes: 0,
        found: backfill.found,
        processed: backfill.found,
      },
      backfill
    );
  }

  // NORMAL RUN: use history.list with watermark
  try {
    const { messageIds, latestHistoryId, rawHistoryChanges } =
      await fetchAddedMessageIds(gmail, historyIdBefore);

    const result = await processIds(gmail, messageIds);

    if (latestHistoryId) await writeSyncState(state.id, latestHistoryId);

    console.log(
      `[gmail/poll] sync complete, mode=history, watermark ${historyIdBefore} -> ${latestHistoryId ?? historyIdBefore}, attached=${result.attached}, unmatched=${result.unmatched}, filtered=${result.filtered}, dupe=${result.duplicates}, skipped=${result.skipped}`
    );

    return buildResult(
      {
        first_run: false,
        mode: 'history',
        history_id_before: historyIdBefore,
        history_id_after: latestHistoryId ?? historyIdBefore,
        raw_history_changes: rawHistoryChanges,
        found: messageIds.length,
        processed: messageIds.length,
      },
      result
    );
  } catch (err: unknown) {
    const status =
      (err as { code?: number }).code ?? (err as { status?: number }).status;
    if (status !== 404) throw err;

    console.warn(
      `[gmail/poll] history watermark ${historyIdBefore} expired (404), falling back to backfill`
    );
    const backfill = await runBackfill(gmail, DEFAULT_BACKFILL_QUERY);

    const profile = await gmail.users.getProfile({ userId: 'me' });
    const historyId = profile.data.historyId ?? null;
    if (historyId) await writeSyncState(state.id, historyId);

    return buildResult(
      {
        first_run: false,
        mode: 'backfill',
        history_id_before: historyIdBefore,
        history_id_after: historyId,
        raw_history_changes: 0,
        found: backfill.found,
        processed: backfill.found,
      },
      backfill
    );
  }
}
