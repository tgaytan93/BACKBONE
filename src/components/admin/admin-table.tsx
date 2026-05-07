import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Edit,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  GripVertical,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

export interface AdminTableColumn<T = unknown> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: unknown, item: T) => React.ReactNode;
  className?: string;
  /** Hide this column in the mobile card view */
  hideOnMobile?: boolean;
  /** Use this column as the card title (first prominent line). Only one column should set this. */
  mobileTitle?: boolean;
}

interface AdminTableProps<T = unknown> {
  columns: AdminTableColumn<T>[];
  data: T[];
  loading?: boolean;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  editLabel?: string;
  deleteLabel?: string;
  emptyMessage?: string;
  rowKey?: (item: T) => string;
  reorderMode?: boolean;
  onDragStart?: (item: T) => void;
  onDragOver?: (e: React.DragEvent<HTMLTableRowElement>, index: number) => void;
  onDrop?: (e: React.DragEvent<HTMLTableRowElement>, index: number) => void;
  actionsWidth?: string;
  customActions?: (item: T) => React.ReactNode;
  /** Render an expandable section below a row. Return null to disable expansion for that item. */
  renderExpandedRow?: (item: T) => React.ReactNode;
  /** Currently expanded row key (controlled) */
  expandedRowKey?: string | null;
  /** Callback when a row is toggled (controlled) */
  onToggleExpand?: (key: string | null) => void;
}

function defaultRowKey<T>(item: T): string {
  const id = (item as { id?: string }).id;
  return id ?? '';
}

export function AdminTable<T = unknown>({
  columns,
  data,
  loading = false,
  sortField,
  sortDirection,
  onSort,
  onEdit,
  onDelete,
  editLabel = 'Edit',
  deleteLabel = 'Delete',
  emptyMessage = 'No items found. Create one to get started.',
  rowKey = defaultRowKey,
  reorderMode = false,
  onDragStart,
  onDragOver,
  onDrop,
  actionsWidth = '80px',
  customActions,
  renderExpandedRow,
  expandedRowKey,
  onToggleExpand,
}: AdminTableProps<T>) {
  const getSortIcon = (field: string) => {
    if (!onSort || sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  const handleSort = (field: string) => {
    if (onSort && columns.find((col) => col.key === field)?.sortable) {
      onSort(field);
    }
  };

  const renderCellValue = (column: AdminTableColumn<T>, item: T) => {
    const value = (item as Record<string, unknown>)[column.key];

    if (column.render) {
      return column.render(value, item);
    }

    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      );
    }

    if (value instanceof Date) {
      return value.toLocaleDateString();
    }

    if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
    }

    return value?.toString() || '-';
  };

  const hasActions = onEdit || onDelete || customActions;
  const totalColumns =
    columns.length + (hasActions ? 1 : 0) + (reorderMode ? 1 : 0);

  const titleColumn = columns.find((c) => c.mobileTitle) || columns[0];
  const detailColumns = columns.filter(
    (c) => c !== titleColumn && !c.hideOnMobile
  );

  // ── Mobile Card View ──
  const mobileCards = (
    <div className="md:hidden space-y-3">
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner size="md" />
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        </div>
      ) : (
        data.map((item, index) => (
          <div
            key={rowKey(item)}
            className="rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2"
            draggable={reorderMode}
            onDragStart={() => onDragStart?.(item)}
            onDragOver={(e) => {
              e.preventDefault();
              onDragOver?.(e as unknown as React.DragEvent<HTMLTableRowElement>, index);
            }}
            onDrop={(e) =>
              onDrop?.(e as unknown as React.DragEvent<HTMLTableRowElement>, index)
            }
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {reorderMode && (
                  <GripVertical className="h-4 w-4 text-muted-foreground/60 cursor-grab flex-shrink-0" />
                )}
                <span className="font-semibold text-sm text-foreground truncate">
                  {renderCellValue(titleColumn, item)}
                </span>
              </div>
              {hasActions && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  {customActions?.(item)}
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(item)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      aria-label={editLabel}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(item)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400"
                      aria-label={deleteLabel}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {detailColumns.length > 0 && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {detailColumns.map((column) => (
                  <div key={column.key} className="flex flex-col min-w-0">
                    <span className="text-muted-foreground/70 truncate">
                      {column.label}
                    </span>
                    <span className="text-foreground truncate">
                      {renderCellValue(column, item)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  // ── Desktop Table View ──
  const desktopTable = (
    <div className="hidden md:block rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-sm shadow-[0_1px_3px_0_hsl(0_0%_0%/0.3),0_1px_2px_-1px_hsl(0_0%_0%/0.2)] overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-white/[0.04] dark:border-white/10">
            {reorderMode && (
              <TableHead className="w-12">
                <span className="sr-only">Reorder</span>
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={`text-foreground ${column.className || ''}`}
                style={{ width: column.width }}
              >
                {column.sortable && onSort ? (
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold text-foreground hover:text-foreground/80"
                    onClick={() => handleSort(column.key)}
                  >
                    {column.label}
                    {getSortIcon(column.key)}
                  </Button>
                ) : (
                  column.label
                )}
              </TableHead>
            ))}
            {hasActions && (
              <TableHead
                className="text-foreground text-right"
                style={{ width: actionsWidth }}
              >
                Actions
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={totalColumns} className="h-24 text-center">
                <div className="flex justify-center">
                  <Spinner size="md" />
                </div>
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={totalColumns} className="h-24 text-center">
                <p className="text-muted-foreground">{emptyMessage}</p>
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, index) => {
              const key = rowKey(item);
              const isExpanded = renderExpandedRow && expandedRowKey === key;
              const canExpand = !!renderExpandedRow;

              return (
                <React.Fragment key={key}>
                  <TableRow
                    className={`border-white/10 hover:bg-white/[0.04] dark:border-white/10 transition-colors ${
                      canExpand ? 'cursor-pointer' : ''
                    } ${isExpanded ? 'bg-white/[0.03]' : ''}`}
                    draggable={reorderMode}
                    onDragStart={() => onDragStart?.(item)}
                    onDragOver={(e) => onDragOver?.(e, index)}
                    onDrop={(e) => onDrop?.(e, index)}
                    onClick={
                      canExpand
                        ? () => onToggleExpand?.(isExpanded ? null : key)
                        : undefined
                    }
                  >
                    {reorderMode && (
                      <TableCell className="text-center">
                        <GripVertical className="h-4 w-4 mx-auto text-muted-foreground/60 cursor-grab" />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={`text-foreground ${column.className || ''}`}
                      >
                        {renderCellValue(column, item)}
                      </TableCell>
                    ))}
                    {hasActions && (
                      <TableCell className="text-right">
                        <div
                          className="flex items-center justify-end gap-1 md:gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {customActions?.(item)}
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(item)}
                              className="h-7 w-7 md:h-8 md:w-8 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <Edit className="h-3 w-3 md:h-4 md:w-4" />
                              <span className="sr-only">{editLabel}</span>
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(item)}
                              className="h-7 w-7 md:h-8 md:w-8 p-0 text-muted-foreground hover:text-red-400"
                            >
                              <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                              <span className="sr-only">{deleteLabel}</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                  {isExpanded && (
                    <TableRow className="border-white/10 dark:border-white/10">
                      <TableCell colSpan={totalColumns} className="p-0">
                        {renderExpandedRow(item)}
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <>
      {mobileCards}
      {desktopTable}
    </>
  );
}
