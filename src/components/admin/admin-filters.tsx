import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Filter, Search } from 'lucide-react';

export interface AdminFilterField {
  key: string;
  label: string;
  type: 'text' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
  clearable?: boolean;
}

interface AdminFiltersProps {
  filters: AdminFilterField[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onClear?: () => void;
  showClearAll?: boolean;
  disabled?: boolean;
  className?: string;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

export function AdminFilters({
  filters,
  values,
  onChange,
  onClear,
  showClearAll = true,
  disabled = false,
  className = '',
  showSearch = false,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
}: AdminFiltersProps) {
  const hasActiveFilters =
    Object.values(values).some(
      (value) =>
        value !== undefined && value !== null && value !== '' && value !== 'all'
    ) || (showSearch && searchValue.trim() !== '');

  const renderFilter = (filter: AdminFilterField) => {
    const value = String(values[filter.key] || '');

    switch (filter.type) {
      case 'select':
        return (
          <div key={filter.key} className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              {filter.label}
            </Label>
            <Select
              value={value}
              onValueChange={(newValue) => {
                if (newValue !== value) {
                  onChange(filter.key, newValue);
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={filter.placeholder || `Select ${filter.label}`}
                />
              </SelectTrigger>
              <SelectContent>
                {filter.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'text':
        return (
          <div key={filter.key} className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              {filter.label}
            </Label>
            <div className="relative">
              <Input
                type="text"
                placeholder={
                  filter.placeholder ||
                  `Search ${filter.label.toLowerCase()}...`
                }
                value={value}
                onChange={(e) => onChange(filter.key, e.target.value)}
                disabled={disabled}
                className="pr-8"
              />
              {value && filter.clearable && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-2 text-muted-foreground hover:text-foreground"
                  onClick={() => onChange(filter.key, '')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getActiveFilterCount = () => {
    let count = Object.entries(values).filter(
      ([, value]) =>
        value !== undefined && value !== null && value !== '' && value !== 'all'
    ).length;

    if (showSearch && searchValue.trim() !== '') {
      count++;
    }

    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div
      className={`space-y-4 p-4 bg-muted/95 rounded-lg border border-border/40 dark:bg-zinc-900/50 dark:border-zinc-800 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount} active
            </Badge>
          )}
        </div>
        {showClearAll && hasActiveFilters && onClear && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-muted-foreground hover:text-foreground h-8 px-3"
            disabled={disabled}
          >
            Clear All
          </Button>
        )}
      </div>

      {showSearch && onSearchChange && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              disabled={disabled}
              className="pl-10 pr-8"
            />
            {searchValue && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-2 text-muted-foreground hover:text-foreground"
                onClick={() => onSearchChange('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filters.map(renderFilter)}
      </div>

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40 dark:border-zinc-800">
          <span className="text-xs text-muted-foreground/60 py-1">
            Active filters:
          </span>

          {showSearch && searchValue.trim() !== '' && onSearchChange && (
            <Badge
              variant="outline"
              className="text-xs flex items-center gap-1 text-foreground border-border/40 dark:border-zinc-600"
            >
              <span className="text-muted-foreground/80">Search:</span>
              <span>{searchValue}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1 text-muted-foreground hover:text-foreground"
                onClick={() => onSearchChange('')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {Object.entries(values).map(([key, value]) => {
            if (!value || value === '' || value === 'all') return null;

            const filter = filters.find((f) => f.key === key);
            if (!filter) return null;

            let displayValue: unknown = value;
            if (filter.type === 'select' && filter.options) {
              const option = filter.options.find((opt) => opt.value === value);
              if (option) {
                displayValue = option.label;
              }
            }

            return (
              <Badge
                key={key}
                variant="outline"
                className="text-xs flex items-center gap-1 text-foreground border-border/40 dark:border-zinc-600"
              >
                <span className="text-muted-foreground/80">{filter.label}:</span>
                <span>{String(displayValue)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1 text-muted-foreground hover:text-foreground"
                  onClick={() => onChange(key, '')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
