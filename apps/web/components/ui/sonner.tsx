'use client';

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-cream group-[.toaster]:text-ink group-[.toaster]:border-parchment group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-ink-muted',
          actionButton: 'group-[.toast]:bg-sage group-[.toast]:text-cream',
          cancelButton: 'group-[.toast]:bg-parchment group-[.toast]:text-ink',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
