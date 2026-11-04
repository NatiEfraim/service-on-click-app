'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Loading, ErrorNotice } from '@/components/ui/Feedback';
import { Stat } from '@/components/ui/Stat';
import { insightsApi } from '@/lib/api/endpoints';
import { statusTone } from '@/lib/labels';
import { barberStatusTiles } from './barber-dashboard';

export function BarberStatusSummary() {
  const router = useRouter();
  const query = useQuery({ queryKey: ['domain-dashboard', 'barber-statuses'], queryFn: ({ signal }) => insightsApi.barberDashboard(signal) });
  const tiles = barberStatusTiles(query.data);
  return (
    <Card spaced title="תורי מספרה לפי סטטוס" hint="כל התורים · לחיצה על סטטוס מציגה את התורים שבו">
      {query.isPending ? <Loading rows={2} /> : query.isError ? <ErrorNotice error={query.error} onRetry={() => void query.refetch()} /> : (
        <div className="barber-status-stats">
          {tiles.map((row, index) => {
            const tone = statusTone(Number(row.status_id));
            return <Stat key={row.status_id} index={index} icon={tone === 'bad' ? 'x' : Number(row.status_id) === 11 ? 'check' : 'inbox'} color={tone === 'bad' ? 'var(--bad)' : tone === 'acc' ? 'var(--accent-teal)' : 'var(--accent)'} label={row.status_display_name} value={row.count} onClick={() => router.push('/requests?view=all&types=5&statuses=' + row.status_id)} />;
          })}
        </div>
      )}
    </Card>
  );
}
