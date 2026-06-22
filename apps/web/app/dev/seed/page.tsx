import { DevSeedImporter } from '@/components/dev/DevSeedImporter';

export default function DevSeedPage() {
  if (process.env.NODE_ENV !== 'development') {
    return (
      <main className="mx-auto max-w-xl px-6 py-10">
        <p className="text-sm text-muted-foreground">This page is available in development only.</p>
      </main>
    );
  }
  return (
    <main>
      <DevSeedImporter />
    </main>
  );
}
