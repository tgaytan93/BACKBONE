import { Check, Circle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

export interface PipelineStep {
  key: string;
  label: string;
}

type StepState = 'done' | 'active' | 'pending' | 'failed';

interface PipelineBarProps {
  steps: PipelineStep[];
  currentStepKey: string;
  failedStepKey?: string;
  className?: string;
}

function deriveState(
  step: PipelineStep,
  index: number,
  steps: PipelineStep[],
  currentStepKey: string,
  failedStepKey?: string
): StepState {
  if (failedStepKey && step.key === failedStepKey) return 'failed';
  const currentIdx = steps.findIndex((s) => s.key === currentStepKey);
  if (currentIdx === -1) return 'pending';
  if (index < currentIdx) return 'done';
  if (index === currentIdx) return 'active';
  return 'pending';
}

function StepIcon({ state }: { state: StepState }) {
  switch (state) {
    case 'done':
      return (
        <div className="h-7 w-7 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
          <Check className="h-4 w-4 text-green-400" />
        </div>
      );
    case 'active':
      return (
        <div className="h-7 w-7 rounded-full bg-[hsl(var(--brand-primary))]/20 border border-[hsl(var(--brand-primary))]/40 flex items-center justify-center">
          <Spinner size="sm" />
        </div>
      );
    case 'failed':
      return (
        <div className="h-7 w-7 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
          <AlertTriangle className="h-3 w-3 text-red-400" />
        </div>
      );
    default:
      return (
        <div className="h-7 w-7 rounded-full bg-foreground/5 border border-foreground/10 flex items-center justify-center">
          <Circle className="h-3 w-3 text-muted-foreground" />
        </div>
      );
  }
}

export function PipelineBar({
  steps,
  currentStepKey,
  failedStepKey,
  className,
}: PipelineBarProps) {
  return (
    <div className={cn('flex items-center w-full gap-2', className)}>
      {steps.map((step, i) => {
        const state = deriveState(step, i, steps, currentStepKey, failedStepKey);
        const labelCls =
          state === 'done'
            ? 'text-green-400'
            : state === 'active'
              ? 'text-[hsl(var(--brand-primary))]'
              : state === 'failed'
                ? 'text-red-400'
                : 'text-muted-foreground';

        const connectorCls =
          state === 'done'
            ? 'bg-green-500/40'
            : state === 'active'
              ? 'bg-[hsl(var(--brand-primary))]/40'
              : 'bg-foreground/10';

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <StepIcon state={state} />
              <span className={cn('text-xs font-mono tracking-wide', labelCls)}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn('h-0.5 flex-1 mx-2 mt-[-1.25rem]', connectorCls)} />
            )}
          </div>
        );
      })}
    </div>
  );
}
