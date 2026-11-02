'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { DomainBadge } from '@/components/booking/DomainBadge';
import { Tabs } from '@/components/ui/Controls';
import { Denied, ErrorNotice, Loading } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/PageHead';
import { SmoothSize } from '@/components/ui/SmoothSize';
import { useSetSearchParams } from '@/lib/useSetSearchParams';
import { useSession } from '@/providers/SessionProvider';
import { TABS } from './constants';
import { DatesTab } from './DatesTab';
import { FormTab } from './FormTab';
import { OperationsTab } from './OperationsTab';
import { OptionsTab } from './OptionsTab';
import { StatementTab } from './StatementTab';
import { TargetTab } from './TargetTab';
import { useSettingsQuery } from './useSettings';
import './settings.css';

const toId = (raw) => {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : 0;
};

/** Settings of one domain in one unit; the tab lives in the URL (`?tab=`). Read-only where the server forbids edits. */
export function SettingsScreen() {
  const params = useParams();
  const search = useSearchParams();
  const setParams = useSetSearchParams();
  const { me, typeName, unitName } = useSession();

  const unitId = toId(params.unitId);
  const bookingTypeId = toId(params.bookingTypeId);
  const query = useSettingsQuery(unitId, bookingTypeId, unitId > 0 && bookingTypeId > 0);

  // the form structure is for the system admin only; a domain commander (approver) does not see the statement either
  const hidden = new Set([...(me.is_super_admin ? [] : ['form']), ...(me.is_super_admin || me.is_admin ? [] : ['statement'])]);
  const tabs = TABS.filter((candidate) => !hidden.has(candidate.id));
  const requested = search.get('tab');
  const tab = tabs.find((candidate) => candidate.id === requested)?.id ?? tabs[0].id;

  if (!unitId || !bookingTypeId) return <Denied>הכתובת אינה תקינה.</Denied>;

  const setTab = (id) => setParams({ tab: id, field: null });

  const name = typeName(bookingTypeId);
  const back = (
    <Link href={`/manage/domains?unit=${unitId}`} className="btn sm ghost back">
      <Icon name="right" />
      חזרה לתחומי שירות
    </Link>
  );

  if (query.isPending) {
    return (
      <>
        <PageHead back={back} title={<span className="st-title"><DomainBadge bookingTypeId={bookingTypeId} />{name}</span>} />
        <Loading rows={8} />
      </>
    );
  }
  if (query.isError) {
    return (
      <>
        <PageHead back={back} title={<span className="st-title"><DomainBadge bookingTypeId={bookingTypeId} />{name}</span>} />
        <ErrorNotice error={query.error} title="לא ניתן לפתוח את ההגדרות." onRetry={query.error && 'denied' in query.error && query.error.denied ? undefined : () => void query.refetch()} />
      </>
    );
  }

  const settings = query.data;
  const ownUnit = me.user.unit_id === unitId;

  return (
    <>
      <PageHead
        back={back}
        title={
          <span className="st-title">
            <DomainBadge bookingTypeId={bookingTypeId} />
            {name}
          </span>
        }
        sub={
          <>
            {unitName(unitId)} ·{' '}
            <Link href={`/requests?view=open&types=${bookingTypeId}${me.is_super_admin ? `&units=${unitId}` : ''}`}>{settings.open_count} קריאות פתוחות</Link>. כל שינוי נשמר מיד, נרשם בהיסטוריית השינויים ומוחל גם באפליקציה.
          </>
        }
      />
      <section className="card st-tabs-card" aria-label={`הגדרות ${name}`}>
        <Tabs tabs={tabs} value={tab} onChange={setTab} label="הגדרות התחום" />
        <SmoothSize className="st-panel" role="tabpanel" aria-label={tabs.find((candidate) => candidate.id === tab)?.label}>
          {tab === 'form' && me.is_super_admin ? <FormTab unitId={unitId} bookingTypeId={bookingTypeId} settings={settings} /> : null}
          {tab === 'target' ? <TargetTab bookingTypeId={bookingTypeId} /> : null}
          {tab === 'refs' ? <OperationsTab unitId={unitId} bookingTypeId={bookingTypeId} settings={settings} ownUnit={ownUnit} /> : null}
          {tab === 'dates' ? <DatesTab unitId={unitId} bookingTypeId={bookingTypeId} settings={settings} ownUnit={ownUnit} ownUnitId={me.user.unit_id} typeName={name} /> : null}
          {tab === 'options' ? <OptionsTab unitId={unitId} bookingTypeId={bookingTypeId} settings={settings} /> : null}
          {tab === 'statement' ? <StatementTab unitId={unitId} bookingTypeId={bookingTypeId} settings={settings} /> : null}
        </SmoothSize>
      </section>
    </>
  );
}
