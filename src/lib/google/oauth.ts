import 'server-only';
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
];

const PROD_REDIRECT_URI = 'https://backbonemade.com/api/google/callback';
const DEV_REDIRECT_URI = 'http://localhost:3000/api/google/callback';

export function getRedirectUri(): string {
  return process.env.NODE_ENV === 'production'
    ? PROD_REDIRECT_URI
    : DEV_REDIRECT_URI;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set.`);
  }
  return value;
}

// Build a fresh OAuth2 client for the consent flow (auth + callback routes).
// Includes the redirect URI so it can generate the consent URL and exchange codes.
export function createOAuthClientForConsent(): OAuth2Client {
  return new google.auth.OAuth2(
    requireEnv('GOOGLE_CLIENT_ID'),
    requireEnv('GOOGLE_CLIENT_SECRET'),
    getRedirectUri()
  );
}

// Build an authenticated OAuth2 client preloaded with the stored refresh token.
// Use this for all runtime Gmail API calls. Access tokens auto-refresh.
export function createAuthedOAuthClient(): OAuth2Client {
  const client = new google.auth.OAuth2(
    requireEnv('GOOGLE_CLIENT_ID'),
    requireEnv('GOOGLE_CLIENT_SECRET')
  );
  client.setCredentials({
    refresh_token: requireEnv('GOOGLE_REFRESH_TOKEN'),
  });
  return client;
}
