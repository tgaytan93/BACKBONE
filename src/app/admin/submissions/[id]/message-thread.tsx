export type Message = {
  id: string;
  direction: 'outbound' | 'inbound';
  subject: string | null;
  body: string;
  from_address: string;
  to_address: string;
  sent_at: string;
  is_auto_reply: boolean;
  read_at: string | null;
};

const MESSAGE_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const parts = MESSAGE_DATE_FORMAT.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const month = get('month');
  const day = get('day');
  const year = get('year');
  const hour = get('hour');
  const minute = get('minute');
  const dayPeriod = get('dayPeriod');
  return `${month} ${day}, ${year} · ${hour}:${minute} ${dayPeriod}`;
}

export default function MessageThread({ messages }: { messages: Message[] }) {
  if (messages.length === 0) {
    return (
      <div className="border border-white/10 bg-zinc-950 px-5 py-8 text-center text-sm text-white/40">
        No messages yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((m) => {
        const isOutbound = m.direction === 'outbound';
        const accentBorder = isOutbound
          ? 'border-l-2 border-l-cyan-400/70'
          : 'border-l-2 border-l-white/70';
        const containerAlign = isOutbound ? '' : 'md:ml-8';
        return (
          <div
            key={m.id}
            className={`relative border border-white/10 bg-zinc-950 p-5 ${accentBorder} ${containerAlign}`}
          >
            {m.is_auto_reply && (
              <div className="absolute top-3 right-3 text-[10px] tracking-[0.25em] font-mono text-white/50 border border-white/20 px-2 py-0.5">
                AUTO
              </div>
            )}
            <div
              className={`text-[10px] tracking-[0.3em] font-mono mb-3 ${
                isOutbound ? 'text-cyan-400' : 'text-white'
              }`}
            >
              {isOutbound ? 'OUTBOUND' : 'INBOUND'}
            </div>
            <div className="text-xs text-white/40 font-mono mb-1">
              FROM <span className="text-white/70">{m.from_address}</span>
            </div>
            <div className="text-xs text-white/40 font-mono mb-3">
              TO <span className="text-white/70">{m.to_address}</span>
            </div>
            {m.subject && (
              <div className="text-sm font-bold text-white mb-3">{m.subject}</div>
            )}
            <p className="text-white/85 text-sm leading-relaxed whitespace-pre-wrap font-mono">
              {m.body}
            </p>
            <div className="mt-4 pt-3 border-t border-white/5 text-[11px] tracking-widest font-mono text-white/40">
              {formatTimestamp(m.sent_at).toUpperCase()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
