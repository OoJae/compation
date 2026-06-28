import type { Metadata } from 'next';
import { html } from '../_content/how-it-works';

export const metadata: Metadata = {
  title: 'Compation — how it works',
  description: 'Azure brains, Injective hands, a wallet that pays its own way: the four-step pipeline from intent to a signed on-chain hedge.',
};

export default function HowItWorksPage() {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
