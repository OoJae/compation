import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Compation — autonomous H100 compute hedging',
  description: 'Hedge NVIDIA H100 GPU compute costs on Injective, with an AI agent that pays its own way.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
