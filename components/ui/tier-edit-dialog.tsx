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
import { TierSelect } from '@/components/ui/tier-select'
import { TierBadge } from '@/components/ui/tier-badge'
import { TierType } from '@/lib/types'

interface TierEditDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  currentTier: TierType
  memberName: string
  onTierUpdate: (newTier: TierType) => void
  canEdit: boolean
}

export function TierEditDialog({
  isOpen,
  onOpenChange,
  currentTier,
  memberName,
  onTierUpdate,
  canEdit
}: TierEditDialogProps) {
  const [selectedTier, setSelectedTier] = useState<TierType>(currentTier)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleSave = async () => {
    if (selectedTier === currentTier) {
      onOpenChange(false)
      return
    }

    setIsUpdating(true)
    try {
      // 실제로는 API 호출이 될 것, 현재는 mock 처리
      await new Promise(resolve => setTimeout(resolve, 500))
      onTierUpdate(selectedTier)
      onOpenChange(false)
    } catch (error) {
      console.error('티어 업데이트 실패:', error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancel = () => {
    setSelectedTier(currentTier)
    onOpenChange(false)
  }

  if (!canEdit) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TierBadge tier={currentTier} size="sm" />
              {memberName}님의 티어
            </DialogTitle>
            <DialogDescription>
              티어 수정 권한이 없습니다. (본인 또는 팀 리더만 수정 가능)
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center py-6">
            <TierBadge tier={currentTier} size="lg" />
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TierBadge tier={currentTier} size="sm" />
            {memberName}님의 티어 수정
          </DialogTitle>
          <DialogDescription>
            현재 랭크 게임 티어를 선택해주세요.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">현재 티어</label>
            <div className="mt-1">
              <TierBadge tier={currentTier} size="md" />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">새로운 티어</label>
            <div className="mt-1">
              <TierSelect
                value={selectedTier}
                onValueChange={setSelectedTier}
                placeholder="티어를 선택하세요"
              />
            </div>
          </div>

          {selectedTier !== currentTier && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium mb-2">변경 내용 미리보기</div>
              <div className="flex items-center gap-2 text-sm">
                <TierBadge tier={currentTier} size="sm" />
                <span>→</span>
                <TierBadge tier={selectedTier} size="sm" />
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
            disabled={isUpdating || selectedTier === currentTier}
          >
            {isUpdating ? '업데이트 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}