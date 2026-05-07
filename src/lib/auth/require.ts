import 'server-only';
import { getSessionContext, type SessionContext } from './session';

export class AuthError extends Error {
  constructor(public readonly code: 'unauthorized' | 'forbidden', message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function requireSession(): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) throw new AuthError('unauthorized', 'Unauthorized.');
  return ctx;
}

export async function requireOrgAccess(orgId: string): Promise<SessionContext> {
  const ctx = await requireSession();
  if (!ctx.isBackboneAdmin && ctx.orgId !== orgId) {
    throw new AuthError('forbidden', 'Cannot access this org.');
  }
  return ctx;
}

export async function requireBackboneAdmin(): Promise<SessionContext> {
  const ctx = await requireSession();
  if (!ctx.isBackboneAdmin) {
    throw new AuthError('forbidden', 'Backbone admin only.');
  }
  return ctx;
}

// Convenience for server actions that want to return { error } shape on auth failure
// instead of throwing. Returns the ctx if authorized, or an error tuple.
export async function tryRequireSession(): Promise<
  | { ctx: SessionContext; error: null }
  | { ctx: null; error: string }
> {
  try {
    const ctx = await requireSession();
    return { ctx, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { ctx: null, error: err.message };
    return { ctx: null, error: 'Unauthorized.' };
  }
}
