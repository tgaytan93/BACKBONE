import 'server-only';
import { Resend } from 'resend';

let client: Resend | null = null;

export function getResend(): Resend {
  if (!client) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error('RESEND_API_KEY is not set.');
    }
    client = new Resend(key);
  }
  return client;
}

export const resend = {
  emails: {
    send: (...args: Parameters<Resend['emails']['send']>) =>
      getResend().emails.send(...args),
  },
};

export const SIGNATURE = `- Tyler
Backbone
backbonemade.com`;

export function appendSignature(body: string): string {
  const trimmed = body.trimEnd();
  return `${trimmed}\n\n${SIGNATURE}`;
}

export function bodyHasSignature(body: string): boolean {
  const lines = body.trimEnd().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    return line.startsWith('-');
  }
  return false;
}
