import { Guard } from '@/components/layout/Guard';
import { BookingsReportScreen } from '@/features/reports/BookingsReportScreen';

export const metadata = { title: 'דו"חות' };

export default function Page() {
  return (
    <Guard capability="reports.view">
      <BookingsReportScreen />
    </Guard>
  );
}
