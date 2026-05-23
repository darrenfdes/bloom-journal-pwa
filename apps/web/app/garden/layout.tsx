import { GardenBodyLock } from '@/components/garden/GardenBodyLock';

export default function GardenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative left-1/2 -ml-[50vw] flex h-dvh max-h-dvh w-screen max-w-none flex-1 flex-col overflow-hidden">
      <GardenBodyLock />
      {children}
    </div>
  );
}
