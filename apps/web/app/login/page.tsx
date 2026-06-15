'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  isSupabaseConfigured,
  resendSignupConfirmation,
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
} from '@/lib/auth/session';
import { syncNow } from '@/lib/sync/engine';

function authErrorMessage(error: { message: string; code?: string }): string {
  switch (error.code) {
    case 'email_not_confirmed':
      return 'Confirm your email first — check your inbox (and spam) for the Supabase link.';
    case 'invalid_credentials':
      return 'Wrong email or password. Create an account first if you have not signed up yet.';
    case 'over_email_send_rate_limit':
      return 'Too many emails sent. Wait a few minutes, then try again.';
    case 'user_already_registered':
      return 'An account with this email already exists. Sign in instead.';
    default:
      return error.message;
  }
}

function LoginForm() {
  const router = useRouter();
  const { refresh } = useAuth();
  const searchParams = useSearchParams();
  const authError = searchParams.get('error');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [busy, setBusy] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <h1 className="font-display text-3xl font-semibold text-ink">Sign in</h1>
        <p className="text-sm text-ink-muted">
          Supabase is not configured. Copy <code className="text-xs">.env.local.example</code> to
          enable cloud backup.
        </p>
        <Button variant="outline" asChild>
          <Link href="/settings">Back to settings</Link>
        </Button>
      </div>
    );
  }

  const handleResendConfirmation = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const { error } = await resendSignupConfirmation(trimmed);
      if (error) {
        toast.error(authErrorMessage(error));
        return;
      }
      toast.message('Confirmation email sent — check your inbox and spam folder.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not resend confirmation email');
    } finally {
      setBusy(false);
    }
  };

  const handleEmailAuth = async () => {
    setBusy(true);
    setNeedsConfirmation(false);
    try {
      const fn = mode === 'signin' ? signInWithPassword : signUpWithPassword;
      const { error, data } = await fn(email.trim(), password);
      if (error) {
        if (error.code === 'email_not_confirmed') {
          setNeedsConfirmation(true);
        }
        toast.error(authErrorMessage(error));
        return;
      }
      if (mode === 'signup' && !data.session) {
        setNeedsConfirmation(true);
        toast.message('Check your email to confirm your account, then sign in.');
        setMode('signin');
        return;
      }
      const uid = data.user?.id ?? data.session?.user.id;
      if (uid) await syncNow(uid);
      await refresh();
      toast.success(mode === 'signin' ? 'Signed in' : 'Account created');
      router.push('/settings');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const { error } = await signInWithGoogle();
      // On error, fall back to the email flow — the form below stays available.
      if (error) {
        setMode('signin');
        toast.error('Google sign-in didn’t work — use your email and password below instead.');
      }
    } catch {
      setMode('signin');
      toast.error('Google sign-in didn’t work — use your email and password below instead.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-ink">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Back up your garden across devices. Your journal stays on this device until you upload.
        </p>
      </header>

      {authError ? (
        <p className="rounded-lg border border-rose/30 bg-rose/10 px-3 py-2 text-sm text-ink">
          {authError === 'google'
            ? 'Google sign-in didn’t complete. You can sign in or create an account with your email below.'
            : 'Sign in failed. Please try again, or use your email below.'}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        <Input
          type="email"
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button disabled={busy || !email || !password} onClick={() => void handleEmailAuth()}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        </Button>
        {needsConfirmation ? (
          <Button variant="outline" disabled={busy || !email} onClick={() => void handleResendConfirmation()}>
            Resend confirmation email
          </Button>
        ) : null}
        <Button variant="outline" disabled={busy} onClick={() => void handleGoogle()}>
          Continue with Google
        </Button>
      </div>

      <p className="text-center text-sm text-ink-soft">
        {mode === 'signin' ? (
          <>
            New here?{' '}
            <button
              type="button"
              className="font-medium text-sage underline"
              onClick={() => setMode('signup')}
            >
              Create account
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              type="button"
              className="font-medium text-sage underline"
              onClick={() => setMode('signin')}
            >
              Sign in
            </button>
          </>
        )}
      </p>

      <Button variant="ghost" asChild>
        <Link href="/settings">Continue without account</Link>
      </Button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-muted">Loading…</p>}>
      <LoginForm />
    </Suspense>
  );
}
