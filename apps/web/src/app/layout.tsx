import type { Metadata, Viewport } from 'next';
import './globals.css';
import '../office/office.css';
import { Nav } from '@/components/Nav';

export const viewport: Viewport = {
  themeColor: '#16110d',
};

export const metadata: Metadata = {
  title: 'yule-agent-workspace',
  description: 'Operating workspace for yule-studio-agent',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="layout">
          <Nav />
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
