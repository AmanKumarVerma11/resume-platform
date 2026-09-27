'use client';

import { useEffect } from 'react';

// A visit counts as an "open" only after the page has been on screen this long.
// Link-preview bots and email scanners rarely stay (or run JavaScript at all).
const OPEN_AFTER_MS = 3000;

export function Tracker({ slug, version }: { slug: string; version: number }) {
  useEffect(() => {
    const send = (type: 'view' | 'print') =>
      fetch('/api/track', {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, version, type }),
      });

    let timer: ReturnType<typeof setTimeout> | undefined;
    let counted = false;
    const onVisibility = () => {
      if (counted) return;
      if (document.visibilityState === 'visible') {
        timer = setTimeout(() => {
          counted = true;
          send('view');
        }, OPEN_AFTER_MS);
      } else {
        clearTimeout(timer);
      }
    };
    // Printing / "Save as PDF" from the browser is another way to download.
    const onPrint = () => send('print');

    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeprint', onPrint);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeprint', onPrint);
    };
  }, [slug, version]);

  return null;
}
