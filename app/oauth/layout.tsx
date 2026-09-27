import type { ReactNode } from 'react';
import '../admin/admin.css';

export default function OAuthLayout({ children }: { children: ReactNode }) {
  return <main className="admin">{children}</main>;
}
