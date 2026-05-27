'use client';
/**
 * Minimal dock. The app is the pixel-art Pixel Office — the only destination is
 * the Lab itself, so the rail carries a single entry. (It almost never renders:
 * every route redirects to /office, which is full-bleed and shows no chrome.)
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useConnection } from '@/lib/live';

const OFFICE_ICON = (
  <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
    <rect x="2" y="1" width="12" height="14" rx="1.5" fillOpacity="0.5" />
    <rect x="4" y="3" width="3" height="2" />
    <rect x="9" y="3" width="3" height="2" />
    <rect x="4" y="7" width="3" height="2" />
    <rect x="9" y="7" width="3" height="2" />
    <rect x="6" y="11" width="4" height="4" />
  </svg>
);

export function Nav() {
  const path = usePathname();
  return (
    <aside className="sidebar">
      <div className="dock">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="logo" src="/icon.svg" alt="Yule Agent Lab" width={40} height={40} />
        <span className="dock-sep" />
        <nav className="nav">
          <Link href="/office" className={path.startsWith('/office') ? 'active' : ''} aria-label="Pixel Office">
            {OFFICE_ICON}
            <span className="label">Pixel Office</span>
          </Link>
        </nav>
        <span className="dock-sep" />
        <div className="foot">
          <ConnDot />
        </div>
      </div>
    </aside>
  );
}

function ConnDot() {
  const connected = useConnection();
  return <span className={`dot ${connected ? 'on' : ''}`} title={connected ? 'live' : 'connecting…'} />;
}
