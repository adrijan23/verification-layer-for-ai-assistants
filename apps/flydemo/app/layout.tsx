import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';

const sans = Outfit({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = { title: 'FlyDemo Airlines', description: 'Book flights with FlyDemo' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
