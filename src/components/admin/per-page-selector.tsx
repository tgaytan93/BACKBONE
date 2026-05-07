'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PerPageSelectorProps {
  value: number;
  onChange: (value: number) => void;
  options?: number[];
  disabled?: boolean;
}

const defaultOptions = [20, 50, 100];

export function PerPageSelector({
  value,
  onChange,
  options = defaultOptions,
  disabled = false,
}: PerPageSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Show</span>
      <Select
        value={value.toString()}
        onValueChange={(stringValue) => onChange(parseInt(stringValue))}
        disabled={disabled}
      >
        <SelectTrigger className="w-20 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option.toString()}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-sm text-muted-foreground">per page</span>
    </div>
  );
}
