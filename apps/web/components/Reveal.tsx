'use client';

import { useEffect } from 'react';

/**
 * Scroll-reveal enhancer — a port of the brand artifacts' `data-reveal` fade-in.
 * Mounted once in the marketing layout; it scans the whole document so it also
 * animates server-injected HTML. Respects prefers-reduced-motion.
 */
export function Reveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (els.length === 0) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      els.forEach((e) => {
        e.style.opacity = '1';
        e.style.transform = 'none';
      });
      return;
    }

    els.forEach((e) => {
      e.style.opacity = '0';
      e.style.transform = 'translateY(26px)';
      e.style.transition = 'opacity .8s cubic-bezier(.16,1,.3,1), transform .8s cubic-bezier(.16,1,.3,1)';
    });

    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          const el = en.target as HTMLElement;
          const delay = parseFloat(el.getAttribute('data-delay') || '0');
          el.style.transitionDelay = `${delay}s`;
          el.style.opacity = '1';
          el.style.transform = 'none';
          io.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );
    els.forEach((e) => io.observe(e));

    // Safety: reveal everything after 4s even if the observer never fires.
    const t = setTimeout(() => els.forEach((e) => {
      e.style.opacity = '1';
      e.style.transform = 'none';
    }), 4000);

    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, []);

  return null;
}
