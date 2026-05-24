'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/components/auth/AuthProvider';
import { hasLocalOnlyData, uploadLocalGarden } from '@/lib/sync/migrate-local';
import { useBloomStore } from '@/stores/useBloomStore';

const SKIP_KEY = 'bloom_migrate_local_skip';

export function MigrateLocalDialog() {
  const { user, loading } = useAuth();
  const refreshEntries = useBloomStore((s) => s.refreshEntries);
  const setGardenMeta = useBloomStore((s) => s.setGardenMeta);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    if (typeof window !== 'undefined' && sessionStorage.getItem(SKIP_KEY)) return;

    void hasLocalOnlyData().then((hasLocal) => {
      if (hasLocal) setOpen(true);
    });
  }, [user, loading]);

  const handleUpload = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await uploadLocalGarden(user.id);
      await refreshEntries();
      const { getOrCreateGardenMeta } = await import('@/lib/db/repositories/garden');
      setGardenMeta(await getOrCreateGardenMeta());
      toast.success('Garden uploaded to your account');
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = () => {
    sessionStorage.setItem(SKIP_KEY, '1');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload this garden?</DialogTitle>
          <DialogDescription>
            You have memories saved on this device. Upload them to your account so they sync across
            devices?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" disabled={busy} onClick={handleSkip}>
            Not now
          </Button>
          <Button disabled={busy} onClick={() => void handleUpload()}>
            {busy ? 'Uploading…' : 'Upload garden'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
