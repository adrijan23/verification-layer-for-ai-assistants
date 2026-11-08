import { ShieldMark } from '@/components/ui';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

/** The stage layout: assistant (left) · customer's phone (middle) · platform console (right). */
export default function StagePage() {
  return (
    <div className="flex h-screen flex-col bg-ink-950">
      <header className="flex items-center gap-3 border-b border-ink-800 px-4 py-2 text-xs text-ink-400">
        <ShieldMark className="h-5 w-5" />
        <span className="font-semibold text-ink-100">{env.displayName}</span>
        {env.demoTools && <span>Live demo</span>}
        <span className="ml-auto hidden gap-6 md:flex">
          <span>① The assistant</span>
          <span>② The customer’s phone</span>
          <span>③ The platform’s {env.displayName} console</span>
        </span>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.15fr)_400px_minmax(0,1fr)]">
        <iframe src={env.agentUrl} title="Assistant" className="h-full w-full border-r border-ink-800 bg-white" />
        <iframe
          src="/phone?embed=1"
          title="Phone"
          className="h-full w-full border-r border-ink-800"
          allow="publickey-credentials-get *; publickey-credentials-create *"
        />
        <iframe src="/dashboard?compact=1" title="Dashboard" className="h-full w-full" />
      </div>
    </div>
  );
}
