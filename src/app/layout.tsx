import type { Metadata } from 'next';
import { Crimson_Pro, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const crimsonPro = Crimson_Pro({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'The Marble Swindle',
  description: 'A LucasArts-style point-and-click adventure set in 1889 Marvel Cave, Missouri',
  keywords: ['adventure game', 'point and click', 'Marvel Cave', 'Silver Dollar City', 'retro game'],
  authors: [{ name: 'The Marble Swindle Team' }],
  openGraph: {
    title: 'The Marble Swindle',
    description: 'A LucasArts-style point-and-click adventure',
    type: 'website',
    images: ['/images/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${crimsonPro.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased bg-slate-950 text-white font-sans">
        {children}
      </body>
    </html>
  );
}
