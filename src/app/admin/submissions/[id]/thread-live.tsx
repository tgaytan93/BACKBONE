'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { markMessageRead } from '@/app/admin/actions';
import MessageThread, { type Message } from './message-thread';

export default function ThreadLive({
  submissionId,
  initialMessages,
}: {
  submissionId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const markedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();

    function upsertMessage(m: Message) {
      setMessages((prev) => {
        const idx = prev.findIndex((x) => x.id === m.id);
        const next =
          idx === -1 ? [...prev, m] : prev.map((x) => (x.id === m.id ? m : x));
        return next.sort(
          (a, b) =>
            new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
        );
      });
    }

    console.log(`[thread] subscribing for submission ${submissionId}`);

    const channel = supabase
      .channel(`messages-${submissionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `submission_id=eq.${submissionId}`,
        },
        (payload) => {
          console.log(
            `[thread] realtime event ${payload.eventType} for submission ${submissionId}`,
            payload.new
          );
          if (
            payload.eventType === 'INSERT' ||
            payload.eventType === 'UPDATE'
          ) {
            const m = payload.new as Message;
            upsertMessage(m);
          } else if (payload.eventType === 'DELETE') {
            const oldM = payload.old as Partial<Message>;
            if (!oldM.id) return;
            console.log(
              `[thread] delete ${oldM.id} for submission ${submissionId}`
            );
            setMessages((prev) => prev.filter((x) => x.id !== oldM.id));
            markedRef.current.delete(oldM.id);
          }
        }
      )
      .subscribe((status) => {
        console.log(
          `[thread] channel status for ${submissionId}: ${status}`
        );
      });

    return () => {
      console.log(`[thread] unsubscribing for submission ${submissionId}`);
      supabase.removeChannel(channel);
    };
  }, [submissionId]);

  // Auto-mark-read every unread inbound message in the thread. Runs on mount
  // and whenever new inbound arrives via realtime. Ref tracks already-fired
  // ids so state churn doesn't re-fire markMessageRead for the same message.
  useEffect(() => {
    const toMark = messages.filter(
      (m) =>
        m.direction === 'inbound' &&
        m.read_at === null &&
        !markedRef.current.has(m.id)
    );
    if (toMark.length === 0) return;
    for (const m of toMark) {
      markedRef.current.add(m.id);
      void markMessageRead(m.id).catch((err) => {
        console.error('[thread] markMessageRead failed', m.id, err);
        markedRef.current.delete(m.id);
      });
    }
  }, [messages]);

  return <MessageThread messages={messages} />;
}
