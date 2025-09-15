import React from 'react'
import { TeamMember, Position } from '@/lib/types'
import { canMemberPlay } from '@/lib/types'

interface PositionCoverageDisplayProps {
  member: TeamMember
  assignedPosition?: Position
  className?: string
}

const positionNames: Record<Position, string> = {
  top: '탑',
  jungle: '정글',
  mid: '미드',
  adc: '원딜',
  support: '서포터'
}

const positions: Position[] = ['top', 'jungle', 'mid', 'adc', 'support']

export default function PositionCoverageDisplay({ 
  member, 
  assignedPosition,
  className = ""
}: PositionCoverageDisplayProps) {
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {positions.map((position) => {
        const canPlay = canMemberPlay(member, position)
        const isMainPosition = member.mainPosition === position
        
        return (
          <span
            key={position}
            className={`
              px-2 py-1 text-xs rounded font-medium
              ${canPlay
                ? isMainPosition
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-semibold'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
              }
            `}
          >
            {positionNames[position]}
            {isMainPosition && ' ★'}
          </span>
        )
      })}
    </div>
  )
}
