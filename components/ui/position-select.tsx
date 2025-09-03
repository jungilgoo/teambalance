'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Position } from '@/lib/types'
import { positionNames } from '@/lib/utils'

interface PositionSelectProps {
  value?: Position
  onValueChange?: (value: Position) => void
  placeholder?: string
  className?: string
}

// 모든 포지션 목록
const allPositions: Position[] = ['top', 'jungle', 'mid', 'adc', 'support']

export function PositionSelect({ 
  value, 
  onValueChange, 
  placeholder = "포지션을 선택하세요",
  className 
}: PositionSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {value && positionNames[value]}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {allPositions.map((position) => (
          <SelectItem key={position} value={position}>
            <div className="flex items-center gap-2">
              <span>{positionNames[position]}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}