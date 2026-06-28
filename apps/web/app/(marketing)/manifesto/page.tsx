import type { Metadata } from 'next';
import { html } from '../_content/manifesto';

export const metadata: Metadata = {
  title: 'Compation — manifesto',
  description: 'Compute is the new commodity. It should trade like one — and the agent that makes that usable.',
};

export default function ManifestoPage() {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
