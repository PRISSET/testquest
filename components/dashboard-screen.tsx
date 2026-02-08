import { WalletCard } from '@/components/wallet-card';
import { PnlCard } from '@/components/pnl-card';
import type { DashboardData } from '@/lib/types';

export function DashboardScreen({ initialData }: { initialData: DashboardData }) {
  return (
    <section className="dashboard-shell">
      <WalletCard metrics={initialData.metrics} />
      <PnlCard publicKey={initialData.metrics.publicKey} initialChart={initialData.chart} />
    </section>
  );
}
