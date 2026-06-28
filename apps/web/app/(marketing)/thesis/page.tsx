import type { Metadata } from 'next';
import { html } from '../_content/thesis';

export const metadata: Metadata = {
  title: 'Compation — the thesis',
  description: 'Going long the on-chain H100 perpetual hedges your compute bill: the mechanism, funding, and liquidation, in plain terms.',
};

export default function ThesisPage() {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
