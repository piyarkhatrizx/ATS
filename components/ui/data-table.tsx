"use client";

import { useCallback, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import type { ReactNode } from "react";
import { EmptyState } from "./empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableLoadingRow,
  TableMessageRow,
  TableRow,
  TableSortHeader,
} from "./table";

/**
 * The candidate list primitive. TanStack Table owns sorting, row models and
 * selection state; this file owns markup and keyboard behaviour.
 *
 * Keyboard is the point: roving tabindex means one Tab stop for the whole list,
 * then j/k (or arrows) to move the cursor and Enter to open. Rows never animate
 * on mount — only the cursor and the hover tint move.
 */
export function DataTable<T>({
  data,
  columns,
  getRowId,
  onRowActivate,
  loading = false,
  empty,
  caption,
  className = "",
  containerClassName = "max-h-[70vh]",
}: {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  getRowId?: (row: T, index: number) => string;
  onRowActivate?: (row: T) => void;
  loading?: boolean;
  empty?: ReactNode;
  caption?: string;
  className?: string;
  containerClassName?: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [cursor, setCursor] = useState(0);
  const bodyRef = useRef<HTMLTableSectionElement>(null);

  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;

  const moveCursor = useCallback((next: number) => {
    setCursor(next);
    const row = bodyRef.current?.rows[next];
    row?.focus();
    row?.scrollIntoView({ block: "nearest" });
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const last = rows.length - 1;

    switch (event.key) {
      case "j":
      case "ArrowDown":
        event.preventDefault();
        moveCursor(Math.min(cursor + 1, last));
        break;
      case "k":
      case "ArrowUp":
        event.preventDefault();
        moveCursor(Math.max(cursor - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        moveCursor(0);
        break;
      case "End":
        event.preventDefault();
        moveCursor(last);
        break;
      case "Enter":
        event.preventDefault();
        if (rows[cursor]) onRowActivate?.(rows[cursor].original);
        break;
      case "x": {
        event.preventDefault();
        rows[cursor]?.toggleSelected();
        break;
      }
      default:
        break;
    }
  }

  const columnCount = table.getAllLeafColumns().length;

  return (
    <Table className={className} containerClassName={containerClassName}>
      {caption && <caption className="sr-only">{caption}</caption>}
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const sortable = header.column.getCanSort();
              const content = header.isPlaceholder
                ? null
                : flexRender(header.column.columnDef.header, header.getContext());

              return sortable ? (
                <TableSortHeader
                  key={header.id}
                  sorted={header.column.getIsSorted()}
                  onSort={header.column.getToggleSortingHandler() as () => void}
                >
                  {content}
                </TableSortHeader>
              ) : (
                <TableCell header key={header.id}>
                  {content}
                </TableCell>
              );
            })}
          </tr>
        ))}
      </TableHeader>
      <TableBody ref={bodyRef}>
        {loading ? (
          <TableLoadingRow colSpan={columnCount} label="Loading candidates" />
        ) : rows.length === 0 ? (
          <TableMessageRow colSpan={columnCount}>
            {empty ?? (
              <EmptyState
                size="compact"
                title="No candidates"
                description="Nothing matches this view yet."
              />
            )}
          </TableMessageRow>
        ) : (
          rows.map((row, index) => (
            <TableRow
              key={row.id}
              selected={row.getIsSelected()}
              active={index === cursor}
              tabIndex={index === cursor ? 0 : -1}
              onFocus={() => setCursor(index)}
              onClick={() => onRowActivate?.(row.original)}
              onDoubleClick={() => onRowActivate?.(row.original)}
              onKeyDown={onKeyDown}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

export type { ColumnDef } from "@tanstack/react-table";
