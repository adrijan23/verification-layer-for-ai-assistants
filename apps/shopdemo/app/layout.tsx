import type { Metadata } from 'next';
import { Nunito_Sans } from 'next/font/google';
import './globals.css';

const sans = Nunito_Sans({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = { title: 'ShopDemo', description: 'Everything, delivered' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
