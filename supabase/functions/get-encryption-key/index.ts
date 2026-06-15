// Returns the caller's per-user Data Encryption Key (DEK) for client-side entry encryption.
//
// The DEK is random per user and stored only in WRAPPED form (AES-GCM encrypted with a master KEK
// held in the ENTRY_MASTER_KEK secret — never in the database). This function verifies the caller's
// JWT, provisions a DEK on first call, and returns the unwrapped DEK over TLS. A DB dump alone
// (wrapped DEK + ciphertext entries) cannot be decrypted without the master KEK.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const MASTER_KEK_B64 = Deno.env.get('ENTRY_MASTER_KEK') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const IV_BYTES = 12;

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

let kekPromise: Promise<CryptoKey> | null = null;
function importKek(): Promise<CryptoKey> {
  if (!MASTER_KEK_B64) throw new Error('ENTRY_MASTER_KEK is not set');
  if (!kekPromise) {
    kekPromise = crypto.subtle.importKey('raw', base64ToBytes(MASTER_KEK_B64), { name: 'AES-GCM' }, false, [
      'encrypt',
      'decrypt',
    ]);
  }
  return kekPromise;
}

// wrapped format: base64( iv(12) || ciphertext+tag )
async function wrapDek(raw: Uint8Array, kek: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek, raw));
  const framed = new Uint8Array(IV_BYTES + ct.length);
  framed.set(iv, 0);
  framed.set(ct, IV_BYTES);
  return bytesToBase64(framed);
}

async function unwrapDek(wrapped: string, kek: CryptoKey): Promise<Uint8Array> {
  const framed = base64ToBytes(wrapped);
  const iv = framed.subarray(0, IV_BYTES);
  const ct = framed.subarray(IV_BYTES);
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, kek, ct));
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders, ...extra },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return json({ error: 'unauthorized' }, 401);

  // Verify the JWT and resolve the user id with a request-scoped client.
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user) return json({ error: 'unauthorized' }, 401);

  let kek: CryptoKey;
  try {
    kek = await importKek();
  } catch {
    return json({ error: 'server_misconfigured' }, 500);
  }

  // Service-role client: reads/writes the wrapped DEK (bypasses RLS).
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: existing, error: selErr } = await admin
    .from('user_encryption_keys')
    .select('wrapped_dek')
    .eq('user_id', user.id)
    .maybeSingle();
  if (selErr) return json({ error: 'lookup_failed' }, 500);

  let rawDek: Uint8Array;
  if (existing?.wrapped_dek) {
    rawDek = await unwrapDek(existing.wrapped_dek, kek);
  } else {
    rawDek = crypto.getRandomValues(new Uint8Array(32));
    const wrapped = await wrapDek(rawDek, kek);
    const { error: insErr } = await admin
      .from('user_encryption_keys')
      .insert({ user_id: user.id, wrapped_dek: wrapped });

    if (insErr) {
      // 23505 = unique_violation: a concurrent request provisioned first; read it back.
      if (insErr.code === '23505') {
        const { data: again } = await admin
          .from('user_encryption_keys')
          .select('wrapped_dek')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!again?.wrapped_dek) return json({ error: 'provision_failed' }, 500);
        rawDek = await unwrapDek(again.wrapped_dek, kek);
      } else {
        return json({ error: 'provision_failed' }, 500);
      }
    }
  }

  return json({ dek: bytesToBase64(rawDek), encVersion: 1 }, 200, { 'Cache-Control': 'no-store' });
});
