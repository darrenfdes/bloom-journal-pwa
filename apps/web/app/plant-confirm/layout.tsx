import { SceneProvider } from '@/lib/scene/SceneContext';

export default function PlantConfirmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center justify-center bg-cream">
      <SceneProvider>{children}</SceneProvider>
    </div>
  );
}
