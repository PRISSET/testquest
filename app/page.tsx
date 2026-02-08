import { Suspense } from 'react';

import { loadDashboardAction } from '@/app/actions';
import { DashboardScreen } from '@/components/dashboard-screen';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const initialData = await loadDashboardAction('6H');

  return (
    <main className="page-shell">
      <Suspense fallback={null}>
        <DashboardScreen initialData={initialData} />
      </Suspense>
    </main>
  );
}
