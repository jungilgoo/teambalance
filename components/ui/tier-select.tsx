'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TierBadge } from "@/components/ui/tier-badge"
import { TierType } from '@/lib/types'
import { tierNames } from '@/lib/utils'

interface TierSelectProps {
  value?: TierType
  onValueChange?: (value: TierType) => void
  placeholder?: string
  className?: string
}

// 모든 티어 목록 (등급 순서대로)
const allTiers: TierType[] = [
  'iron_iv', 'iron_iii', 'iron_ii', 'iron_i',
  'bronze_iv', 'bronze_iii', 'bronze_ii', 'bronze_i',
  'silver_iv', 'silver_iii', 'silver_ii', 'silver_i',
  'gold_iv', 'gold_iii', 'gold_ii', 'gold_i',
  'platinum_iv', 'platinum_iii', 'platinum_ii', 'platinum_i',
  'emerald_iv', 'emerald_iii', 'emerald_ii', 'emerald_i',
  'diamond_iv', 'diamond_iii', 'diamond_ii', 'diamond_i',
  'master', 'grandmaster', 'challenger'
]

export function TierSelect({ 
  value, 
  onValueChange, 
  placeholder = "티어를 선택하세요",
  className 
}: TierSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {value && <TierBadge tier={value} size="sm" />}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {allTiers.map((tier) => (
          <SelectItem key={tier} value={tier}>
            <div className="flex items-center gap-2">
              <TierBadge tier={tier} size="sm" />
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}