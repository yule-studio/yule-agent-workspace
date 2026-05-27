'use client';
/**
 * App shell. The Pixel Office (`/office`) is a full-bleed game surface: it
 * renders NO global chrome at all — no nav rail (.sidebar/.dock), no menu
 * button (.hq-menu), no scrim (.hq-scrim). Navigation lives inside the office
 * HUD. Every other route keeps the docked nav rail.
 */
import { usePathname } from 'next/navigation';
import { Nav } from '@/components/Nav';

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (path.startsWith('/office')) {
    return <main className="main flush">{children}</main>;
  }
  return (
    <div className="layout">
      <Nav />
      <main className="main">{children}</main>
    </div>
  );
}
