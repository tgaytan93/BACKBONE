import { NextResponse } from 'next/server';
import { createOAuthClientForConsent } from '@/lib/google/oauth';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderPage(opts: {
  title: string;
  status: 'success' | 'error';
  message: string;
  token?: string;
}): string {
  const accent = opts.status === 'success' ? '#22d3ee' : '#f87171';
  const tokenBlock = opts.token
    ? `
      <div class="label">REFRESH TOKEN</div>
      <pre class="token">${escapeHtml(opts.token)}</pre>
      <p class="hint">
        Copy this refresh token now. Paste it into <code>GOOGLE_REFRESH_TOKEN</code> in
        <code>.env.local</code>. This page is the only time it will be shown. Restart your
        dev server after pasting.
      </p>
    `
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Backbone, Google OAuth</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background: #000;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif;
      padding: 4rem 1.5rem;
    }
    .wrap { max-width: 720px; margin: 0 auto; }
    .eyebrow {
      font-family: "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace;
      font-size: 11px;
      letter-spacing: 0.3em;
      color: ${accent};
      margin-bottom: 0.75rem;
    }
    h1 {
      font-size: 2rem;
      font-weight: 900;
      letter-spacing: -0.01em;
      line-height: 1.1;
      margin: 0 0 1rem;
    }
    .message {
      color: rgba(255,255,255,0.7);
      font-size: 0.95rem;
      line-height: 1.6;
      margin-bottom: 2.5rem;
    }
    .label {
      font-family: "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace;
      font-size: 10px;
      letter-spacing: 0.25em;
      color: rgba(255,255,255,0.4);
      margin-bottom: 0.75rem;
    }
    .token {
      font-family: "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace;
      font-size: 13px;
      background: #0a0a0a;
      border: 1px solid rgba(255,255,255,0.15);
      padding: 1rem;
      color: ${accent};
      white-space: pre-wrap;
      word-break: break-all;
      user-select: all;
      margin: 0 0 1rem;
    }
    .hint {
      color: rgba(255,255,255,0.55);
      font-size: 0.85rem;
      line-height: 1.6;
    }
    code {
      font-family: "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace;
      background: rgba(255,255,255,0.06);
      padding: 1px 6px;
      font-size: 0.85em;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="eyebrow">${opts.status === 'success' ? 'GOOGLE OAUTH, SUCCESS' : 'GOOGLE OAUTH, ERROR'}</div>
    <h1>${escapeHtml(opts.title)}</h1>
    <p class="message">${escapeHtml(opts.message)}</p>
    ${tokenBlock}
  </div>
</body>
</html>`;
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Disabled in production.' }, { status: 403 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const oauthError = url.searchParams.get('error');

  if (oauthError) {
    return new Response(
      renderPage({
        status: 'error',
        title: 'Google denied the consent.',
        message: oauthError,
      }),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  if (!code) {
    return new Response(
      renderPage({
        status: 'error',
        title: 'Missing authorization code.',
        message: 'Google did not return a code parameter. Re-run the consent flow.',
      }),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  try {
    const client = createOAuthClientForConsent();
    const { tokens } = await client.getToken(code);
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      return new Response(
        renderPage({
          status: 'error',
          title: 'No refresh token returned.',
          message:
            'Google did not include a refresh token. Revoke the app at myaccount.google.com (Security, Third-party access) and run the consent flow again.',
        }),
        { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    return new Response(
      renderPage({
        status: 'success',
        title: 'Refresh token captured.',
        message:
          'Save this token immediately. You will not see it again. After pasting, restart your dev server so the new env var loads.',
        token: refreshToken,
      }),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Token exchange failed.';
    return new Response(
      renderPage({
        status: 'error',
        title: 'Token exchange failed.',
        message: msg,
      }),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}
