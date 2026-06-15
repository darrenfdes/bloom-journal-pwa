import type { Session, User } from '@supabase/supabase-js';

import { clearDek } from '@/lib/crypto/key-session';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseBrowserClient());
}

export async function getSession(): Promise<Session | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  await supabase.auth.signOut();
  clearDek(); // a different user on this browser must not reuse the cached key
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithPassword(email: string, password: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error('Supabase is not configured');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return supabase.auth.signUp({
    email,
    password,
    options: origin ? { emailRedirectTo: `${origin}/auth/callback` } : undefined,
  });
}

export async function resendSignupConfirmation(email: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase.auth.resend({ type: 'signup', email });
}

export async function signInWithGoogle() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error('Supabase is not configured');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback` },
  });
}
