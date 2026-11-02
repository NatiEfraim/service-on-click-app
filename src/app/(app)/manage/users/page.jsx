
import { Guard } from '@/components/layout/Guard';
import { UsersScreen } from '@/features/people/UsersScreen';

export const metadata = { title: 'משתמשים והרשאות' };

export default function UsersPage() {
  return (
    <Guard capability="users.manage" message="ניהול משתמשים זמין למנהל מערכת ולמפקדי מחנה.">
      <UsersScreen />
    </Guard>
  );
}
