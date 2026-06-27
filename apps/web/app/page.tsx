import { agentMeta } from '@/lib/agent.server';
import { Header } from '@/components/Header';
import { Chat } from '@/components/Chat';
import { Disclaimer } from '@/components/Disclaimer';

export default function Page() {
  const meta = agentMeta();
  return (
    <div className="grid-bg flex min-h-screen flex-col">
      <Header meta={meta} />
      <Chat meta={meta} />
      <Disclaimer />
    </div>
  );
}
