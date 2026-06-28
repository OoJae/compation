import type { Metadata } from 'next';
import { html } from './_content/home';
import { LandingFx } from '@/components/LandingFx';

export const metadata: Metadata = {
  title: 'Compation — hedge the price of compute',
  description:
    'Compation is an autonomous agent that hedges your AI compute costs on-chain — and pays for its own compute while it does. Built on Injective.',
};

export default function LandingPage() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <LandingFx />
    </>
  );
}
