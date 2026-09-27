'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const DISMISSED_KEY = 'cookie-notice-dismissed';

// Informational banner. It doesn't gate anything; closing it just hides it on this browser.
export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(DISMISSED_KEY) !== '1');
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;
  return (
    <div className="cookie-notice" role="region" aria-label="Cookie notice">
      <p>
        This site uses cookies for analytics. <Link href="/cookies">Learn more</Link>
      </p>
      <button type="button" onClick={dismiss}>
        OK
      </button>
    </div>
  );
}
