'use client'

import { useState, useEffect } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Position } from '@/lib/types'
import { positionNames } from '@/lib/utils'

interface MultiPositionSelectProps {
  mainPosition: Position
  selectedPositions: Position[]
  onPositionsChange: (positions: Position[]) => void
  maxSelections?: number
  className?: string
}

export function MultiPositionSelect({
  mainPosition,
  selectedPositions,
  onPositionsChange,
  maxSelections = 4,
  className = ''
}: MultiPositionSelectProps) {
  const allPositions: Position[] = ['top', 'jungle', 'mid', 'adc', 'support']
  
  // 주포지션을 제외한 선택 가능한 포지션들
  const availablePositions = allPositions.filter(pos => pos !== mainPosition)
  
  const handlePositionToggle = (position: Position, checked: boolean) => {
    let newSelections: Position[]
    
    if (checked) {
      // 최대 선택 수 제한
      if (selectedPositions.length >= maxSelections) {
        return
      }
      newSelections = [...selectedPositions, position]
    } else {
      // 최소 1개 선택 유지 (선택 해제할 때 체크)
      if (selectedPositions.length <= 1) {
        return
      }
      newSelections = selectedPositions.filter(pos => pos !== position)
    }
    
    onPositionsChange(newSelections)
  }
  
  const isPositionSelected = (position: Position) => {
    return selectedPositions.includes(position)
  }
  
  const canSelectMore = selectedPositions.length < maxSelections

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="space-y-2">
        <div className="text-sm font-medium text-muted-foreground">
          부포지션 선택 ({selectedPositions.length}/{maxSelections}) - 최소 1개 선택 필수
        </div>
        <div className="text-xs text-muted-foreground">
          주포지션인 <span className="font-medium">{positionNames[mainPosition]}</span>를 제외한 포지션들 중에서 최소 1개 이상 선택하세요
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {availablePositions.map((position) => {
          const isSelected = isPositionSelected(position)
          const canSelect = canSelectMore || isSelected
          const canUncheck = !isSelected || selectedPositions.length > 1
          
          return (
            <div key={position} className="flex items-center space-x-2">
              <Checkbox
                id={`position-${position}`}
                checked={isSelected}
                disabled={(!canSelect && !isSelected) || (isSelected && !canUncheck)}
                onCheckedChange={(checked) => 
                  handlePositionToggle(position, checked as boolean)
                }
              />
              <Label
                htmlFor={`position-${position}`}
                className={`text-sm ${
                  (!canSelect && !isSelected) || (isSelected && !canUncheck) 
                    ? 'text-muted-foreground' 
                    : 'cursor-pointer'
                } ${isSelected ? 'font-medium' : ''}`}
              >
                {positionNames[position]}
              </Label>
            </div>
          )
        })}
      </div>
      
      {selectedPositions.length > 0 && (
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="text-sm font-medium mb-2">선택된 부포지션</div>
          <div className="flex flex-wrap gap-2">
            <div className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
              주: {positionNames[mainPosition]}
            </div>
            {selectedPositions.map((position, index) => (
              <div 
                key={position}
                className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium"
              >
                부{index + 1}: {positionNames[position]}
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            스킬 가중치: 주포지션 100%, 부포지션 {80 - selectedPositions.length * 10}%~80%
          </div>
        </div>
      )}
      
      {selectedPositions.length === 1 && (
        <div className="text-xs text-blue-600 font-medium">
          최소 1개의 부포지션이 필요합니다. 마지막 포지션은 해제할 수 없습니다.
        </div>
      )}
      
      {!canSelectMore && selectedPositions.length > 1 && (
        <div className="text-xs text-amber-600 font-medium">
          최대 {maxSelections}개까지 선택할 수 있습니다
        </div>
      )}
    </div>
  )
}