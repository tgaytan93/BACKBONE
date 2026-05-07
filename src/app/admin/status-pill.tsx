type Status =
  | 'new'
  | 'needs_response'
  | 'contacted'
  | 'qualified'
  | 'won'
  | 'lost';

const STYLES: Record<Status, string> = {
  new: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/40',
  needs_response: 'bg-orange-400/10 text-orange-400 border-orange-400/40',
  contacted: 'bg-white/10 text-white border-white/40',
  qualified: 'bg-yellow-400/10 text-yellow-400 border-yellow-400/40',
  won: 'bg-green-500/10 text-green-400 border-green-500/40',
  lost: 'bg-red-500/5 text-red-400/60 border-red-500/30',
};

const LABELS: Record<Status, string> = {
  new: 'NEW',
  needs_response: 'NEEDS RESPONSE',
  contacted: 'CONTACTED',
  qualified: 'QUALIFIED',
  won: 'WON',
  lost: 'LOST',
};

export default function StatusPill({ status }: { status: string | null }) {
  const value = (status ?? 'new') as Status;
  const cls = STYLES[value] ?? STYLES.new;
  const label = LABELS[value] ?? LABELS.new;
  return (
    <span
      className={`inline-block border px-2 py-0.5 text-[10px] tracking-[0.2em] font-mono uppercase ${cls}`}
    >
      {label}
    </span>
  );
}

export const STATUSES: Status[] = [
  'new',
  'needs_response',
  'contacted',
  'qualified',
  'won',
  'lost',
];
export type { Status };
