import Link from 'next/link';

export function LegalLinks() {
  return (
    <>
      <Link href="/privacy">Privacy Policy</Link> · <Link href="/terms">Terms</Link> ·{' '}
      <Link href="/cookies">Cookie Policy</Link>
    </>
  );
}
