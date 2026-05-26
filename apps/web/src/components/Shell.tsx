'use client';
/**
 * App shell. On the Pixel Office (`/office`) the global nav rail is hidden so
 * the map owns the viewport — a small top-left menu button reveals the rail as
 * an overlay (Esc / scrim closes it). Every other route keeps the rail docked.
 */
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Nav } from '@/components/Nav';

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const office = path.startsWith('/office');
  const [menu, setMenu] = useState(false);

  useEffect(() => setMenu(false), [path]);
  useEffect(() => {
    if (!office) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [office]);

  return (
    <div className={`layout${office ? ' office-mode' : ''}${menu ? ' menu-open' : ''}`}>
      {office && (
        <button className="hq-menu" aria-label="Menu" onClick={() => setMenu((m) => !m)}>
          <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
            <rect x="2" y="3.5" width="12" height="2" rx="1" />
            <rect x="2" y="7" width="12" height="2" rx="1" />
            <rect x="2" y="10.5" width="12" height="2" rx="1" />
          </svg>
        </button>
      )}
      <Nav />
      {office && menu && <div className="hq-scrim" onClick={() => setMenu(false)} />}
      <main className={`main${office ? ' flush' : ''}`}>{children}</main>
    </div>
  );
}
