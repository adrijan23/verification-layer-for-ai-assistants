import { ConnectFlow } from '@/components/ConnectFlow';
import { DEMO_USER } from '@/lib/seed';
import { env } from '@/lib/env';
import { getPlatformConfig } from '@/lib/platforms';
import { getSession } from '@/lib/repo';

export const dynamic = 'force-dynamic';

export default function ConnectPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const sid = searchParams.sid ?? '';
  const cfg = searchParams.p ? getPlatformConfig(searchParams.p) : undefined;
  const session = sid ? getSession(sid) : undefined;
  const embed = searchParams.embed === '1';

  if (!cfg || !session || session.platformId !== cfg.platformId) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F3F5F9] p-6 text-ink-900">
        <div className="max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold">This approval link is not valid</p>
          <p className="mt-2 text-sm text-ink-500">Ask your assistant to send a new one.</p>
        </div>
      </div>
    );
  }

  const permissions = cfg.defaultGrant.map((p) => {
    const def = cfg.actions.find((a) => a.id === p.action)!;
    const guard = cfg.guardrails.find((g) => g.action === p.action && g.mode === 'deny');
    return { ...p, label: def.label ?? p.action, risk: def.risk, locked: !!guard };
  });

  return (
    <ConnectFlow
      embed={embed}
      appName={env.displayName}
      sid={sid}
      platform={{ id: cfg.platformId, name: cfg.displayName, brand: cfg.brand }}
      agentName={session.agentName}
      alreadyConnected={session.status === 'authorized'}
      permissions={permissions}
      defaultEmail={DEMO_USER.email}
      defaultPassword={DEMO_USER.password}
      fallbackEnabled={env.passkeyFallback}
    />
  );
}
