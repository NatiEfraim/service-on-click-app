'use client';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chips';
import { initials } from '@/lib/format';
import { useSession } from '@/providers/SessionProvider';
import { grantChip } from './permissions';
import type { PersonRow } from './people';

/** One row per person with roles by domain and a button that opens permissions. */
export function PeopleTable({ rows, onOpen }: { rows: PersonRow[]; onOpen: (row: PersonRow) => void }) {
  const { typeName } = useSession();
  // `get-approvers` does not say where a person sits; only the full user list does
  const showAffiliation = rows.some((row) => row.affiliation !== null);

  return (
    <div className="tbl-wrap">
      <table className="t">
        <thead>
          <tr>
            <th scope="col">משתמש</th>
            {showAffiliation ? <th scope="col">יחידה ומחלקה</th> : null}
            <th scope="col">תפקידים לפי תחום</th>
            <th scope="col">
              <span className="sr">פעולות</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const label = row.name ?? `ת״ז ${row.personalId ?? ''}`.trim();
            return (
              // mouse shortcut; the last-cell button is the keyboard path
              <tr key={row.uuid} className="clk" onClick={() => onOpen(row)}>
                <td>
                  <div className="ppl-user">
                    <span className="avatar" aria-hidden="true">
                      {initials(row.name) || '?'}
                    </span>
                    <div>
                      <b className={row.name ? undefined : 'nameless'}>{row.name ?? 'ללא שם'}</b>
                      <div className="ppl-ids">
                        {row.personalNumber ? (
                          <span>
                            מספר אישי <bdi className="serial">{row.personalNumber}</bdi>
                          </span>
                        ) : null}
                        {row.personalId ? (
                          <span>
                            ת״ז <bdi className="serial">{row.personalId}</bdi>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </td>
                {showAffiliation ? (
                  <td>
                    {row.affiliation ? (
                      <>
                        {row.affiliation.unitName ?? 'ללא שיוך ליחידה'}
                        <div className="small muted">{row.affiliation.departmentName ?? 'ללא מחלקה'}</div>
                      </>
                    ) : null}
                  </td>
                ) : null}
                <td>
                  <div className="ppl-roles">
                    {row.isSuperAdmin ? <Chip tone="info">מנהל מערכת</Chip> : null}
                    {row.grants.map((grant) => {
                      const chip = grantChip(grant, typeName);
                      return (
                        <Chip key={grant.role} tone={grant.role === 'admin' ? 'hold' : 'acc'} title={chip.title}>
                          {chip.label}
                        </Chip>
                      );
                    })}
                    {!row.isSuperAdmin && row.grants.length === 0 ? <span className="muted small">ללא תפקיד</span> : null}
                  </div>
                </td>
                <td className="ppl-act">
                  <Button
                    size="sm"
                    aria-label={`הרשאות של ${label}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(row);
                    }}
                  >
                    הרשאות
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
