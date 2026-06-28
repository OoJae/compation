import { agentMeta, agentIdentity } from '@/lib/agent.server';
import { Header } from '@/components/Header';
import { Chat } from '@/components/Chat';
import { Disclaimer } from '@/components/Disclaimer';

export const metadata = {
  title: 'Compation — live demo',
  description: 'Tell Compation your H100 compute spend; it builds and opens the hedge on Injective, live.',
};

export default function AppPage() {
  const meta = agentMeta();
  const identity = agentIdentity();
  return (
    <div className="grid-bg flex min-h-screen flex-col">
      <Header meta={meta} />
      <Chat meta={meta} identity={identity} />
      <Disclaimer />
    </div>
  );
}
