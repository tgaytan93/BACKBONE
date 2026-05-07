'use client';

import { useMemo, useState } from 'react';
import { Briefcase } from 'lucide-react';
import {
  AdminTable,
  type AdminTableColumn,
} from '@/components/admin/admin-table';
import { AdminPageLayout } from '@/components/admin/admin-page-layout';
import { PipelineBar } from '@/components/admin/pipeline-bar';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AdminDialog,
  type AdminFormField,
} from '@/components/admin/admin-dialog';
import {
  AdminFilters,
  type AdminFilterField,
} from '@/components/admin/admin-filters';
import { DeleteConfirmationDialog } from '@/components/admin/delete-confirmation-dialog';
import { PerPageSelector } from '@/components/admin/per-page-selector';

type DummyRow = {
  id: string;
  name: string;
  status: string;
  created_at: string;
  active: boolean;
};

const INITIAL_DUMMY_ROWS: DummyRow[] = [
  {
    id: '1',
    name: 'Acme HVAC',
    status: 'active',
    created_at: '2026-04-12T00:00:00Z',
    active: true,
  },
  {
    id: '2',
    name: 'Conway Comfort',
    status: 'active',
    created_at: '2026-04-22T00:00:00Z',
    active: true,
  },
  {
    id: '3',
    name: 'Pioneer Plumbing',
    status: 'pending',
    created_at: '2026-05-01T00:00:00Z',
    active: false,
  },
  {
    id: '4',
    name: 'Northstar Roofing',
    status: 'active',
    created_at: '2026-05-03T00:00:00Z',
    active: true,
  },
  {
    id: '5',
    name: 'Old Line Electric',
    status: 'archived',
    created_at: '2025-12-15T00:00:00Z',
    active: false,
  },
];


const PIPELINE_STEPS = [
  { key: 'discovery', label: 'Discovery' },
  { key: 'scope', label: 'Scope' },
  { key: 'build', label: 'Build' },
  { key: 'review', label: 'Review' },
  { key: 'handoff', label: 'Handoff' },
];

const DIALOG_FIELDS: AdminFormField[] = [
  { key: 'name', label: 'Business name', type: 'text', required: true },
  { key: 'email', label: 'Owner email', type: 'email', required: true },
  {
    key: 'tier',
    label: 'Tier',
    type: 'select',
    required: true,
    options: [
      { value: 'foundation', label: 'Foundation' },
      { value: 'operator', label: 'Operator' },
      { value: 'autopilot', label: 'Autopilot' },
    ],
  },
  { key: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
  { key: 'priority', label: 'High priority', type: 'checkbox' },
];

const FILTER_FIELDS: AdminFilterField[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'all', label: 'All' },
      { value: 'active', label: 'Active' },
      { value: 'pending', label: 'Pending' },
      { value: 'archived', label: 'Archived' },
    ],
  },
  {
    key: 'tier',
    label: 'Tier',
    type: 'select',
    options: [
      { value: 'all', label: 'All' },
      { value: 'foundation', label: 'Foundation' },
      { value: 'operator', label: 'Operator' },
      { value: 'autopilot', label: 'Autopilot' },
    ],
  },
  {
    key: 'business',
    label: 'Business name contains',
    type: 'text',
    clearable: true,
  },
];

export default function AdminUiPreviewPage() {
  const [rows, setRows] = useState<DummyRow[]>(INITIAL_DUMMY_ROWS);
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<DummyRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [perPage, setPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, unknown>>({
    status: '',
    tier: '',
    business: '',
  });
  const [deleteTarget, setDeleteTarget] = useState<DummyRow | null>(null);

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }

  function toggleActive(id: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  }

  // Apply search + filters to the rows before passing to the table.
  // Demonstrates the end-to-end filter UI -> derived data -> table flow.
  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const statusFilter = String(filters.status ?? '');
    const businessFilter = String(filters.business ?? '').toLowerCase();
    return rows.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q)) return false;
      if (statusFilter && statusFilter !== 'all' && r.status !== statusFilter) {
        return false;
      }
      if (businessFilter && !r.name.toLowerCase().includes(businessFilter)) {
        return false;
      }
      return true;
    });
  }, [rows, search, filters]);

  const columns = useMemo<AdminTableColumn<DummyRow>[]>(
    () => [
      { key: 'name', label: 'Name', sortable: true, mobileTitle: true },
      { key: 'status', label: 'Status', sortable: true },
      { key: 'created_at', label: 'Created', sortable: true },
      {
        key: 'active',
        label: 'Active',
        render: (value, item) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleActive(item.id);
            }}
            className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring rounded"
            aria-label={`Toggle ${item.name} active state`}
          >
            <Badge variant={value ? 'default' : 'secondary'}>
              {value ? 'Active' : 'Inactive'}
            </Badge>
          </button>
        ),
      },
    ],
    []
  );

  // Map the dummy row shape onto the DIALOG_FIELDS shape so the dialog
  // pre-fills with whatever fields overlap. In a real app the row and the
  // form fields would share a schema.
  const dialogInitialData = editingRow
    ? { name: editingRow.name, tier: '', email: '', notes: '', priority: false }
    : undefined;

  return (
    <div className="bg-background text-foreground min-h-screen p-6 md:p-12 max-w-6xl mx-auto space-y-12">
      <AdminPageLayout
        title="Admin UI Preview"
        description="Smoke test for lifted Serenyx primitives"
        icon={<Briefcase className="h-5 w-5" />}
        itemCount={rows.length}
        itemName="component"
      >
        <Section title="AdminTable">
          <AdminTable<DummyRow>
            columns={columns}
            data={visibleRows}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            onEdit={(row) => {
              setEditingRow(row);
              setDialogOpen(true);
            }}
            onDelete={(row) => {
              setDeleteTarget(row);
              setDeleteOpen(true);
            }}
          />
        </Section>

        <Section title="Spinner">
          <div className="flex items-center gap-6">
            <Spinner size="xs" />
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
          </div>
        </Section>

        <Section title="PipelineBar (active)">
          <PipelineBar steps={PIPELINE_STEPS} currentStepKey="build" />
        </Section>

        <Section title="PipelineBar (failed)">
          <PipelineBar
            steps={PIPELINE_STEPS}
            currentStepKey="review"
            failedStepKey="review"
          />
        </Section>

        <Section title="AdminFilters">
          <AdminFilters
            filters={FILTER_FIELDS}
            values={filters}
            onChange={(key, value) =>
              setFilters((prev) => ({ ...prev, [key]: value }))
            }
            onClear={() =>
              setFilters({ status: '', tier: '', business: '' })
            }
            showSearch
            searchValue={search}
            onSearchChange={setSearch}
          />
        </Section>

        <Section title="PerPageSelector">
          <PerPageSelector value={perPage} onChange={setPerPage} />
        </Section>

        <Section title="AdminDialog">
          <Button
            onClick={() => {
              setEditingRow(null);
              setDialogOpen(true);
            }}
          >
            Open create dialog
          </Button>
          <AdminDialog
            isOpen={dialogOpen}
            onClose={() => {
              setDialogOpen(false);
              setEditingRow(null);
            }}
            title={editingRow ? `Edit ${editingRow.name}` : 'Create org'}
            description={
              editingRow
                ? 'Update this org. Only the name is pre-filled in this preview.'
                : "Fill out the new org's metadata."
            }
            fields={DIALOG_FIELDS}
            initialData={dialogInitialData}
            isEditMode={!!editingRow}
            onSave={async (data) => {
              console.log(
                editingRow ? '[preview] update' : '[preview] create',
                data
              );
              await new Promise((r) => setTimeout(r, 400));
            }}
          />
        </Section>

        <Section title="DeleteConfirmationDialog">
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            Open delete dialog
          </Button>
          <DeleteConfirmationDialog
            isOpen={deleteOpen}
            onClose={() => {
              setDeleteOpen(false);
              setDeleteTarget(null);
            }}
            onConfirm={async () => {
              console.log('[preview] delete', deleteTarget?.id);
              await new Promise((r) => setTimeout(r, 400));
            }}
            itemName={deleteTarget?.name}
            itemType="org"
          />
        </Section>
      </AdminPageLayout>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-mono tracking-widest uppercase text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}
