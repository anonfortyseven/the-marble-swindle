import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en">
      <body className="antialiased bg-slate-950 text-white font-sans">
        {children}
      </body>
    </html>
  );
}
