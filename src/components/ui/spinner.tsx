import { cn } from '@/lib/utils';

interface SpinnerProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function Spinner({ className, size = 'md' }: SpinnerProps) {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-[hsl(var(--brand-primary))] border-t-transparent',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
