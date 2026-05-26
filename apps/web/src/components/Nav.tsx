'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useConnection } from '@/lib/live';

const I = {
  dashboard: (
    <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="4" rx="1" />
      <rect x="9" y="7" width="6" height="8" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
    </svg>
  ),
  office: (
    <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
      <path d="M8 1 L15 7 H1 Z" />
      <rect x="2" y="7" width="12" height="8" rx="1" />
      <rect x="6.5" y="10" width="3" height="5" fill="#241b13" />
    </svg>
  ),
  agents: (
    <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
      <circle cx="8" cy="5" r="3" />
      <path d="M2 15 a6 6 0 0 1 12 0 Z" />
    </svg>
  ),
  tasks: (
    <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
      <rect x="2" y="2" width="12" height="12" rx="2" fillOpacity="0.25" />
      <path d="M5 8 l2 2 l4 -5" stroke="currentColor" strokeWidth="1.6" fill="none" />
    </svg>
  ),
};

const LINKS = [
  { href: '/', label: 'Dashboard', ico: I.dashboard },
  { href: '/office', label: 'Pixel Office', ico: I.office },
  { href: '/agents', label: 'Agents', ico: I.agents },
  { href: '/tasks', label: 'Tasks & Sessions', ico: I.tasks },
];

export function Nav() {
  const path = usePathname();
  return (
    <aside className="sidebar">
      <div className="brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="logo" src="/icon.svg" alt="" width={34} height={34} />
        <div>
          <h1>yule workspace</h1>
          <span className="tag">operating surface · v0.1</span>
        </div>
      </div>
      <nav className="nav">
        {LINKS.map((l) => {
          const active = l.href === '/' ? path === '/' : path.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} className={active ? 'active' : ''}>
              <span className="ico">{l.ico}</span>
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="foot">
        <ConnectionDot />
      </div>
    </aside>
  );
}

export function ConnectionDot() {
  const connected = useConnection();
  return (
    <span className="conn">
      <span className={`dot ${connected ? 'on' : ''}`} />
      {connected ? 'live · connected' : 'connecting…'}
    </span>
  );
}
