import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface AdminPageLayoutProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  itemCount?: number;
  itemName: string;
  /** Override naive `${itemName}s` pluralization. Falls back to itemName + 's'. */
  itemNamePlural?: string;
  children: React.ReactNode;
  onCreateItem?: () => void;
  createButtonText?: string;
  createButtonDisabled?: boolean;
  extraActions?: React.ReactNode;
}

export function AdminPageLayout({
  title,
  description,
  icon,
  itemCount,
  itemName,
  itemNamePlural,
  children,
  onCreateItem,
  createButtonText,
  createButtonDisabled = false,
  extraActions,
}: AdminPageLayoutProps) {
  const pluralName = itemNamePlural ?? `${itemName}s`;
  const displayDescription =
    itemCount !== undefined
      ? `${description} (${itemCount} ${itemCount === 1 ? itemName : pluralName})`
      : description;

  return (
    <div className="w-full min-w-0 max-w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white/[0.05] backdrop-blur-sm border border-white/10 shadow-sm flex items-center justify-center flex-shrink-0">
              <div className="text-[hsl(var(--brand-primary))]">{icon}</div>
            </div>
            <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl section-title flex items-center gap-2">
              <span className="truncate">{title}</span>
            </h1>
          </div>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base md:text-lg max-w-2xl">
            {displayDescription}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {extraActions}
          {onCreateItem && (
            <Button
              onClick={onCreateItem}
              className="bg-[hsl(var(--brand-primary))] hover:bg-[hsl(var(--brand-primary))]/80 text-black font-semibold text-sm md:text-base"
              disabled={createButtonDisabled}
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">
                {createButtonText || `Create ${itemName}`}
              </span>
              <span className="sm:hidden">Create</span>
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6 w-full min-w-0 max-w-full overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
