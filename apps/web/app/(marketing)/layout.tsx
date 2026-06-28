import type { ReactNode } from 'react';
import { Reveal } from '@/components/Reveal';

/** Marketing route group — the designed pages are injected per-route; Reveal
 *  animates their `data-reveal` elements document-wide. */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Reveal />
    </>
  );
}
