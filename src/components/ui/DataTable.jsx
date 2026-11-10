'use client';

import { Fragment, useMemo, useState } from 'react';
import { Icon } from './Icon';
import { nextSort, sortRows } from './table-sort';

/**
 * The console's table: `.tbl-wrap` + `table.t`, header row from `columns`, an empty state, and sortable headers.
 *
 * columns: [{ id, header, cell: (row) => node, className?, sortValue?: (row) => value, sortable?: boolean }]
 *   - `sortValue` sorts in the browser (only for lists that are loaded whole);
 *   - with `sort` + `onSortChange` the screen sorts (e.g. asks the server) and a column opts in with `sortable`.
 * rowProps(row): props for the <tr> (className, onClick...). after(row): rendered right after the row (an ExpandRow).
 */
export function DataTable({ columns, rows, rowKey, rowProps, after, empty = null, label, className = '', sort: controlledSort, onSortChange }) {
  const controlled = typeof onSortChange === 'function';
  const [ownSort, setOwnSort] = useState(null);
  const sort = controlled ? controlledSort ?? null : ownSort;

  const sorted = useMemo(() => {
    if (controlled || !sort) return rows;
    const column = columns.find((candidate) => candidate.id === sort.id);
    return column?.sortValue ? sortRows(rows, column.sortValue, sort.dir) : rows;
  }, [rows, columns, sort, controlled]);

  if (!rows.length) return empty;

  const choose = (id) => {
    const next = nextSort(sort, id);
    if (controlled) onSortChange(next);
    else setOwnSort(next);
  };

  return (
    <div className={`tbl-wrap${className ? ` ${className}` : ''}`}>
      <table className="t" aria-label={label}>
        <thead>
          <tr>
            {columns.map((column) => {
              const canSort = controlled ? Boolean(column.sortable) : Boolean(column.sortValue);
              const active = sort?.id === column.id;
              return (
                <th
                  key={column.id}
                  scope="col"
                  className={column.className}
                  aria-sort={canSort ? (active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
                >
                  {canSort ? (
                    <button type="button" className={`th-sort${active ? ' on' : ''}`} onClick={() => choose(column.id)}>
                      {column.header}
                      <Icon name={active && sort.dir === 'desc' ? 'down' : 'up'} />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const key = rowKey(row);
            return (
              <Fragment key={key}>
                <tr {...(rowProps ? rowProps(row) : {})}>
                  {columns.map((column) => (
                    <td key={column.id} className={column.className}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
                {after ? after(row) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
