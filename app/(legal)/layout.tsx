import type { ReactNode } from 'react';
import { LegalLinks } from '@/components/LegalLinks';
import './legal.css';

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <main className="legal">
      {children}
      <footer>
        <LegalLinks />
      </footer>
    </main>
  );
}
