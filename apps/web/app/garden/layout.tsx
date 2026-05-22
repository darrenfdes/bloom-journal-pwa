export default function GardenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative left-1/2 -ml-[50vw] w-screen max-w-none flex-1">
      {children}
    </div>
  );
}
