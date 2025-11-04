'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PositionSelect } from '@/components/ui/position-select'
import { MultiPositionSelect } from '@/components/ui/multi-position-select'
import { Position } from '@/lib/types'
import { positionNames } from '@/lib/utils'

interface PositionEditDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  currentMainPosition: Position
  currentSubPositions: Position[] // 다중 부포지션
  memberName: string
  onPositionUpdate: (mainPosition: Position, subPositions: Position[]) => void
  canEdit: boolean
}

export function PositionEditDialog({
  isOpen,
  onOpenChange,
  currentMainPosition,
  currentSubPositions,
  memberName,
  onPositionUpdate,
  canEdit
}: PositionEditDialogProps) {
  const [selectedMainPosition, setSelectedMainPosition] = useState<Position>(currentMainPosition)
  const [selectedSubPositions, setSelectedSubPositions] = useState<Position[]>(currentSubPositions)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleSave = async () => {
    // 변경사항 확인
    const hasMainPositionChanged = selectedMainPosition !== currentMainPosition
    const hasSubPositionsChanged = JSON.stringify(selectedSubPositions.sort()) !== JSON.stringify(currentSubPositions.sort())
    
    if (!hasMainPositionChanged && !hasSubPositionsChanged) {
      onOpenChange(false)
      return
    }

    // 부포지션이 최소 1개는 있어야 함
    if (selectedSubPositions.length === 0) {
      alert('부포지션을 최소 1개 이상 선택해주세요.')
      return
    }

    // 주포지션이 부포지션에 포함되어 있으면 오류
    if (selectedSubPositions.includes(selectedMainPosition)) {
      alert('주 포지션과 부 포지션은 다르게 선택해주세요.')
      return
    }

    // 부포지션에 중복이 있으면 오류
    const uniqueSubPositions = [...new Set(selectedSubPositions)]
    if (uniqueSubPositions.length !== selectedSubPositions.length) {
      alert('부 포지션에 중복된 값이 있습니다.')
      return
    }

    setIsUpdating(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      onPositionUpdate(selectedMainPosition, selectedSubPositions)
      onOpenChange(false)
    } catch (error) {
      console.error('포지션 업데이트 실패:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancel = () => {
    setSelectedMainPosition(currentMainPosition)
    setSelectedSubPositions(currentSubPositions)
    onOpenChange(false)
  }

  if (!canEdit) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {memberName}님의 포지션
            </DialogTitle>
            <DialogDescription>
              포지션 수정 권한이 없습니다. (본인 또는 팀 리더만 수정 가능)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-6">
            <div>
              <span className="text-sm font-medium text-muted-foreground">주 포지션</span>
              <div className="text-lg font-semibold">{positionNames[currentMainPosition]}</div>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">
                부 포지션 ({currentSubPositions.length}개)
              </span>
              {currentSubPositions.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {currentSubPositions.map((position, index) => (
                    <span key={position} className="px-2 py-1 bg-muted text-sm rounded">
                      {positionNames[position]}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground">선택된 부포지션 없음</div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const hasMainPositionChanged = selectedMainPosition !== currentMainPosition
  const hasSubPositionsChanged = JSON.stringify(selectedSubPositions.sort()) !== JSON.stringify(currentSubPositions.sort())
  const hasChanged = hasMainPositionChanged || hasSubPositionsChanged
  const hasInvalidSelection = selectedSubPositions.includes(selectedMainPosition)
  const hasEmptySubPositions = selectedSubPositions.length === 0

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {memberName}님의 포지션 수정
          </DialogTitle>
          <DialogDescription>
            주 포지션과 부 포지션을 선택해주세요.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">현재 포지션</label>
            <div className="mt-1 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                  주: {positionNames[currentMainPosition]}
                </span>
              </div>
              {currentSubPositions.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {currentSubPositions.map((position, index) => (
                    <span key={position} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                      부{index + 1}: {positionNames[position]}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">선택된 부포지션 없음</div>
              )}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">새로운 주 포지션</label>
            <div className="mt-1">
              <PositionSelect
                value={selectedMainPosition}
                onValueChange={(newMain) => {
                  setSelectedMainPosition(newMain)
                  // 새로운 주포지션이 기존 부포지션에 포함되어 있으면 제거
                  setSelectedSubPositions(prev => prev.filter(pos => pos !== newMain))
                }}
                placeholder="주 포지션 선택"
              />
            </div>
          </div>
          
          <div>
            <MultiPositionSelect
              mainPosition={selectedMainPosition}
              selectedPositions={selectedSubPositions}
              onPositionsChange={setSelectedSubPositions}
              maxSelections={4}
            />
          </div>

          {hasEmptySubPositions && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm text-red-600">
                부포지션을 최소 1개 이상 선택해주세요.
              </div>
            </div>
          )}

          {hasInvalidSelection && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm text-red-600">
                주 포지션과 부 포지션은 다르게 선택해주세요.
              </div>
            </div>
          )}

          {hasChanged && !hasInvalidSelection && !hasEmptySubPositions && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium mb-2">변경 내용 미리보기</div>
              <div className="space-y-2 text-sm">
                {hasMainPositionChanged && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">주포지션:</span>
                    <span>{positionNames[currentMainPosition]}</span>
                    <span>→</span>
                    <span className="font-medium">{positionNames[selectedMainPosition]}</span>
                  </div>
                )}
                {hasSubPositionsChanged && (
                  <div>
                    <div className="text-muted-foreground mb-1">부포지션:</div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {currentSubPositions.length > 0 ? currentSubPositions.map(pos => (
                        <span key={pos} className="px-1 py-0.5 bg-gray-200 rounded text-xs">
                          {positionNames[pos]}
                        </span>
                      )) : <span className="text-xs text-muted-foreground">없음</span>}
                    </div>
                    <div className="text-center text-muted-foreground">↓</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedSubPositions.length > 0 ? selectedSubPositions.map(pos => (
                        <span key={pos} className="px-1 py-0.5 bg-green-200 rounded text-xs font-medium">
                          {positionNames[pos]}
                        </span>
                      )) : <span className="text-xs text-muted-foreground">없음</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isUpdating}>
            취소
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isUpdating || !hasChanged || hasInvalidSelection || hasEmptySubPositions}
          >
            {isUpdating ? '업데이트 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}