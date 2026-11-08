import { Phone } from '@/components/Phone';
import { env } from '@/lib/env';
import { getPlatformConfigs } from '@/lib/platforms';
import { DEMO_USER } from '@/lib/seed';

export const dynamic = 'force-dynamic';

export default function PhonePage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const brands = Object.fromEntries([...getPlatformConfigs().values()].map((c) => [c.platformId, { name: c.displayName, ...c.brand }]));
  return (
    <Phone
      embed={searchParams.embed === '1'}
      ownerEmail={DEMO_USER.email}
      ownerName={DEMO_USER.displayName}
      appName={env.displayName}
      brands={brands}
      fallbackEnabled={env.passkeyFallback}
    />
  );
}
