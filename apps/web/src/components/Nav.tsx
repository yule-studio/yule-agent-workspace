'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useConnection } from '@/lib/live';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/office', label: 'Pixel Office' },
  { href: '/agents', label: 'Agents' },
  { href: '/tasks', label: 'Tasks & Sessions' },
];

export function Nav() {
  const path = usePathname();
  return (
    <aside className="sidebar">
      <h1>yule workspace</h1>
      <span className="tag">operating surface · v0.1</span>
      <nav className="nav">
        {LINKS.map((l) => {
          const active = l.href === '/' ? path === '/' : path.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} className={active ? 'active' : ''}>
              {l.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function ConnectionDot() {
  const connected = useConnection();
  return (
    <span className="conn">
      <span className={`dot ${connected ? 'on' : ''}`} />
      {connected ? 'live' : 'connecting…'}
    </span>
  );
}
