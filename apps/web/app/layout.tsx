import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Archivo, Bricolage_Grotesque, JetBrains_Mono, Newsreader } from 'next/font/google';

const archivo = Archivo({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-archivo', display: 'swap' });
const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-bricolage', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-jetbrains', display: 'swap' });
const newsreader = Newsreader({ subsets: ['latin'], weight: ['400', '500'], style: ['italic'], variable: '--font-newsreader', display: 'swap' });

export const metadata: Metadata = {
  title: 'Compation — hedge the price of compute',
  description:
    'Compation is an autonomous agent that hedges your AI compute costs on-chain — and pays for its own compute while it does. Built on Injective.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const fontVars = `${archivo.variable} ${bricolage.variable} ${jetbrains.variable} ${newsreader.variable}`;
  return (
    <html lang="en" className={fontVars}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
