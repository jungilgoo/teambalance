import { TierType } from '@/lib/types'
import { getTierColor, cn } from '@/lib/utils'
import { tierNames } from '@/lib/utils'

interface TierBadgeProps {
  tier: TierType
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function TierBadge({ tier, className, size = 'md' }: TierBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs font-medium',
    md: 'px-3 py-1 text-sm font-semibold',
    lg: 'px-4 py-2 text-base font-bold'
  }

  return (
    <span
      data-testid={`tier-badge-${tier}`}
      data-size={size}
      className={cn(
        'inline-flex items-center rounded-md border',
        getTierColor(tier),
        sizeClasses[size],
        className
      )}
    >
      {tierNames[tier]}
    </span>
  )
}