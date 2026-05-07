import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export type SessionContext = {
  userId: string;
  email: string | null;
  orgId: string | null;
  orgRole: 'owner' | 'backbone_admin' | null;
  isBackboneAdmin: boolean;
};

// V1: looks up org_memberships server-side by user_id. Reliable and works
// before the JWT custom_access_token_hook is enabled in the dashboard.
//
// V2 optimization: read org_id and org_role from JWT claims set by the hook
// to avoid the extra query. Leaving as TODO until we confirm the hook is on
// in all environments.
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Use admin client for the membership lookup so RLS on org_memberships
  // doesn't block first-load before claims are present.
  const admin = createAdminClient();
  const { data: membership } = await admin
    .from('org_memberships')
    .select('org_id, role')
    .eq('user_id', user.id)
    .order('role', { ascending: true }) // 'backbone_admin' < 'owner' alphabetically
    .limit(1)
    .maybeSingle();

  const orgId = membership?.org_id ?? null;
  const orgRole = (membership?.role as 'owner' | 'backbone_admin' | null) ?? null;

  return {
    userId: user.id,
    email: user.email ?? null,
    orgId,
    orgRole,
    isBackboneAdmin: orgRole === 'backbone_admin',
  };
}
