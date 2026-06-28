import type { Metadata } from 'next';
import { html } from '../_content/builders';

export const metadata: Metadata = {
  title: 'Compation — for builders',
  description: 'Run it, read it, verify it. Open source and testnet-real: clone, point at testnet, and watch a real position open on Injective.',
};

export default function BuildersPage() {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
