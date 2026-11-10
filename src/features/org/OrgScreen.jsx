'use client';

import { SHOW_DEPARTMENTS } from '@/lib/labels';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chips';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState, ErrorNotice, Loading, Notice } from '@/components/ui/Feedback';
import { PageHead } from '@/components/ui/PageHead';
import { ApiError } from '@/lib/api/client';
import { orgApi } from '@/lib/api/endpoints';
import { keys } from '@/lib/api/keys';

import { useToast } from '@/providers/UiProvider';
import { DepartmentDialog } from './DepartmentDialog';
import { isUnnamed } from './rules';
import { UnitDialog } from './UnitDialog';
import { useAfterOrgChange } from './useAfterOrgChange';
import './org.css';

/** Units and departments (super admin). The unit letter is all the mobile app knows; departments are local. */
export function OrgScreen() {
  const toast = useToast();
  const afterChange = useAfterOrgChange();
  const org = useQuery({ queryKey: keys.org, queryFn: ({ signal }) => orgApi.list(signal) });

  const [pickedId, setPickedId] = useState(null);
  const [unitDialog, setUnitDialog] = useState(null);
  const [departmentDialog, setDepartmentDialog] = useState(null);
  const [actionError, setActionError] = useState('');

  const units = org.data ?? [];
  const selected = units.find((unit) => unit.id === pickedId) ?? units[0] ?? null;

  const toggle = useMutation({
    mutationFn: (department) => orgApi.updateDepartment(department.id, { is_active: !department.is_active }),
    onSuccess: async (_result, department) => {
      setActionError('');
      toast(department.is_active ? 'המחלקה הושבתה.' : 'המחלקה הופעלה.', 'ok');
      await afterChange();
    },
    onError: async (e) => {
      const apiError = e instanceof ApiError ? e : new ApiError(0, 'הפעולה נכשלה.');
      // 409 (people still assigned) also means the head counts may be stale
      setActionError(apiError.message);
      if (apiError.stale) await afterChange();
    },
  });

  const pick = (id) => {
    setPickedId(id);
    setActionError('');
  };

  const unitColumns = [
    { id: 'code', header: 'אות (מוצגת באפליקציה)', sortValue: (unit) => unit.code, cell: (unit) => <span className="code">{unit.code}</span> },
    {
      id: 'name',
      header: 'שם היחידה (פנימי)',
      sortValue: (unit) => (isUnnamed(unit) ? '' : unit.name),
      cell: (unit) => (
        <span className="org-name">
          <button type="button" className="org-pick" aria-current={unit.id === selected?.id ? 'true' : undefined} onClick={() => pick(unit.id)}>
            {unit.name}
          </button>
          {isUnnamed(unit) ? <Chip tone="warn">טרם הוגדר שם</Chip> : null}
        </span>
      ),
    },
    ...(SHOW_DEPARTMENTS
      ? [{ id: 'departments', header: 'מחלקות', className: 'num', sortValue: (unit) => unit.departments.filter((department) => department.is_active).length, cell: (unit) => unit.departments.filter((department) => department.is_active).length }]
      : []),
    { id: 'users', header: 'משתמשים', className: 'num', sortValue: (unit) => unit.users, cell: (unit) => unit.users },
    {
      id: 'actions',
      header: <span className="sr">פעולות</span>,
      className: 'org-act',
      cell: (unit) => (
        <Button
          size="sm"
          icon="edit" data-tip="עריכה"
          aria-label={`עריכת היחידה ${unit.name}`}
          onClick={(event) => {
            event.stopPropagation();
            setUnitDialog({ unit });
          }}
         />
      ),
    },
  ];

  return (
    <div>
      <PageHead hideTitle title={SHOW_DEPARTMENTS ? 'יחידות ומחלקות' : 'יחידות'} />

      <Card
        title="יחידות"
        hint={SHOW_DEPARTMENTS ? 'לחיצה על יחידה מציגה את המחלקות שלה' : undefined}
        tools={
          <Button size="sm" variant="primary" icon="plus" aria-label="יחידה חדשה" data-tip="יחידה חדשה" onClick={() => setUnitDialog({ unit: null })} />
        }
      >
        {org.isPending ? (
          <CardBody>
            <Loading rows={4} />
          </CardBody>
        ) : org.isError ? (
          <CardBody>
            <ErrorNotice error={org.error} onRetry={() => void org.refetch()} />
          </CardBody>
        ) : units.length ? (
          <DataTable
            label="יחידות"
            columns={unitColumns}
            rows={units}
            rowKey={(unit) => unit.id}
            // mouse shortcut; the name inside is the keyboard path
            rowProps={SHOW_DEPARTMENTS ? (unit) => ({ className: 'clk', onClick: () => pick(unit.id) }) : undefined}
          />
        ) : (
          <EmptyState title="אין יחידות">אפשר להוסיף יחידה חדשה.</EmptyState>
        )}
      </Card>

      {SHOW_DEPARTMENTS && selected ? (
        <Card
          spaced
          aria-label={`מחלקות ביחידה ${selected.name}`}
          title={`מחלקות ביחידה ${selected.name}`}
          hint="פנימי בלבד, לא מועבר לאפליקציה"
          tools={
            <Button size="sm" variant="primary" icon="plus" onClick={() => setDepartmentDialog({ department: null })}>
              מחלקה חדשה
            </Button>
          }
        >
          {actionError ? (
            <CardBody>
              <Notice tone="bad">{actionError}</Notice>
            </CardBody>
          ) : null}
          {selected.departments.length ? (
            <div className="tbl-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th scope="col">שם המחלקה</th>
                    <th scope="col" className="num">
                      משתמשים
                    </th>
                    <th scope="col">מצב</th>
                    <th scope="col">
                      <span className="sr">פעולות</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selected.departments.map((department) => (
                    <tr key={department.id}>
                      <td>
                        <b>{department.name}</b>
                      </td>
                      <td className="num">{department.users}</td>
                      <td>{department.is_active ? <Chip tone="ok">פעילה</Chip> : <Chip>מושבתת</Chip>}</td>
                      <td className="org-act">
                        <Button size="sm" icon="edit" data-tip="עריכה" aria-label={`עריכת המחלקה ${department.name}`} onClick={() => setDepartmentDialog({ department })} />
                        <Button
                          size="sm"
                          variant={department.is_active ? 'danger' : 'default'}
                          loading={toggle.isPending && toggle.variables?.id === department.id}
                          disabled={toggle.isPending}
                          aria-label={`${department.is_active ? 'השבתת' : 'הפעלת'} המחלקה ${department.name}`}
                          onClick={() => {
                            setActionError('');
                            toggle.mutate(department);
                          }}
                        >
                          {department.is_active ? 'השבתה' : 'הפעלה'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="אין מחלקות ביחידה זו">אפשר להוסיף מחלקה חדשה.</EmptyState>
          )}
        </Card>
      ) : null}

      {unitDialog ? <UnitDialog unit={unitDialog.unit} units={units} onClose={() => setUnitDialog(null)} onSaved={pick} /> : null}
      {departmentDialog && selected ? <DepartmentDialog unit={selected} department={departmentDialog.department} onClose={() => setDepartmentDialog(null)} /> : null}
    </div>
  );
}
