import { Dashboard } from '@/components/Dashboard';
import { dashboardSnapshot } from '@/lib/snapshot';

export const dynamic = 'force-dynamic';

export default function DashboardPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  return <Dashboard initial={dashboardSnapshot()} compact={searchParams.compact === '1'} />;
}
