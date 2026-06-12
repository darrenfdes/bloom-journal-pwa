'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type PwaStatus = {
  online: boolean;
  installAvailable: boolean;
  installed: boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notifyInstallListeners() {
  for (const listener of listeners) listener();
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && Boolean(navigator.standalone))
  );
}

export function usePwaStatus(): PwaStatus {
  const [online, setOnline] = useState(true);
  const [installAvailable, setInstallAvailable] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const refreshInstallState = () => {
      setInstallAvailable(deferredPrompt != null);
      setInstalled(isStandalone());
    };

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPrompt = event as BeforeInstallPromptEvent;
      notifyInstallListeners();
    };
    const handleInstalled = () => {
      deferredPrompt = null;
      notifyInstallListeners();
    };

    setOnline(navigator.onLine);
    refreshInstallState();
    listeners.add(refreshInstallState);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      listeners.delete(refreshInstallState);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return 'unavailable';
    const prompt = deferredPrompt;
    deferredPrompt = null;
    notifyInstallListeners();
    await prompt.prompt();
    const choice = await prompt.userChoice;
    return choice.outcome;
  };

  return {
    online,
    installAvailable,
    installed,
    promptInstall,
  };
}
