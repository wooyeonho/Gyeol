import React from 'react';
import { Ghost, Inbox, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface EmptyStateProps {
  icon?: 'ghost' | 'inbox' | 'alert';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const iconMap = {
  ghost: Ghost,
  inbox: Inbox,
  alert: AlertCircle,
};

export function EmptyState({
  icon = 'inbox',
  title = 'No items found',
  description = 'There is nothing to display here at the moment.',
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  const IconComponent = iconMap[icon];

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-neutral-800 rounded-xl bg-neutral-950/50 ${className}`}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-900 mb-4">
        <IconComponent className="h-8 w-8 text-neutral-500" />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-sm text-neutral-400 max-w-sm mb-6">{description}</p>

      {actionLabel && onAction && (
        <Button onClick={onAction} variant="secondary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
