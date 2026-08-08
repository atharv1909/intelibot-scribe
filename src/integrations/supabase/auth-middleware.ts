import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export async function getAuthenticatedContextFromRequest(request: Request) {
  const SUPABASE_URL =
    process.env['SUPABASE_URL'] ||
    process.env['VITE_SUPABASE_URL'] ||
    'https://ytxggpkqiotocubltqsk.supabase.co';

  const SUPABASE_PUBLISHABLE_KEY =
    process.env['SUPABASE_PUBLISHABLE_KEY'] ||
    process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ||
    'sb_publishable_k_QCC0Af8s1-J6JnaJA9rQ_sNJ0HPIK';

  const authHeader = request.headers.get('authorization');
  let token = authHeader?.replace('Bearer ', '')?.trim();

  const supabase = createClient<Database>(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      global: {
        fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
        headers: token && token.split('.').length === 3 ? { Authorization: `Bearer ${token}` } : {},
      },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    }
  );

  let userId = "00000000-0000-0000-0000-000000000000";
  if (token && token.split('.').length === 3) {
    try {
      const { data } = await supabase.auth.getClaims(token);
      if (data?.claims?.sub) {
        userId = data.claims.sub;
      }
    } catch {
      // Ignore token decode error and use default user context
    }
  }

  return { supabase, userId };
}

export async function getAuthenticatedContext() {
  const { getRequest } = await import('@tanstack/react-start/server');
  const request = getRequest();
  if (!request) {
    const SUPABASE_URL =
      process.env['SUPABASE_URL'] ||
      process.env['VITE_SUPABASE_URL'] ||
      'https://ytxggpkqiotocubltqsk.supabase.co';

    const SUPABASE_PUBLISHABLE_KEY =
      process.env['SUPABASE_PUBLISHABLE_KEY'] ||
      process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ||
      'sb_publishable_k_QCC0Af8s1-J6JnaJA9rQ_sNJ0HPIK';

    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    return { supabase, userId: "00000000-0000-0000-0000-000000000000" };
  }
  return getAuthenticatedContextFromRequest(request);
}
