'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  isSupabaseConfigured,
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
} from '@/lib/auth/session';
import { pullForUser } from '@/lib/sync/engine';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get('error');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [busy, setBusy] = useState(false);

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

  const handleEmailAuth = async () => {
    setBusy(true);
    try {
      const fn = mode === 'signin' ? signInWithPassword : signUpWithPassword;
      const { error, data } = await fn(email.trim(), password);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (mode === 'signup' && !data.session) {
        toast.message('Check your email to confirm your account');
        return;
      }
      const uid = data.user?.id ?? data.session?.user.id;
      if (uid) await pullForUser(uid);
      toast.success(mode === 'signin' ? 'Signed in' : 'Account created');
      router.push('/settings');
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
      if (error) toast.error(error.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Google sign in failed');
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
          Sign in failed. Please try again.
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
