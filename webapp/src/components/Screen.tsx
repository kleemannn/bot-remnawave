import { PropsWithChildren } from 'react';

export function Screen({ children }: PropsWithChildren) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[480px] px-4 pb-[calc(env(safe-area-inset-bottom)+96px)] pt-2">
      {children}
    </main>
  );
}
