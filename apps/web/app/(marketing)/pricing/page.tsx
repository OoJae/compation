import type { Metadata } from 'next';
import { html } from '../_content/pricing';

export const metadata: Metadata = {
  title: 'Compation — pricing',
  description: 'No subscription, no custody. Compation earns where it executes — protocol fee rebates as the feeRecipient on every fill.',
};

export default function PricingPage() {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
