'use client'

import * as React from 'react'
import { Search, User, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TeamMember } from '@/lib/types'

interface MobileMemberSelectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value?: string
  onValueChange?: (value: string) => void
  members: TeamMember[]
  excludeMembers?: string[]
  placeholder?: string
}

export function MobileMemberSelectModal({
  open,
  onOpenChange,
  value = '',
  onValueChange,
  members,
  excludeMembers = [],
  placeholder = '멤버 선택...'
}: MobileMemberSelectModalProps) {
  const [searchQuery, setSearchQuery] = React.useState('')

  // 선택 가능한 멤버들 (제외 목록 필터링)
  const availableMembers = members.filter(member =>
    !excludeMembers.includes(member.id)
  )

  // 검색 필터링
  const filteredMembers = availableMembers.filter(member =>
    member.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.tier.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.mainPosition.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 현재 선택된 멤버 찾기
  const selectedMember = members.find(member => member.id === value)

  // 멤버 선택 처리
  const handleMemberSelect = (memberId: string) => {
    onValueChange?.(memberId === value ? '' : memberId)
    onOpenChange(false)
    setSearchQuery('') // 검색어 초기화
  }

  // 모달이 닫힐 때 검색어 초기화
  React.useEffect(() => {
    if (!open) {
      setSearchQuery('')
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md mx-auto h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <User className="w-5 h-5" />
            멤버 선택
          </DialogTitle>
        </DialogHeader>

        {/* 검색 입력 */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="멤버 검색 (닉네임, 티어, 포지션)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* 멤버 목록 */}
        <div className="flex-1 overflow-y-auto">
          {filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <User className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-center">
                {searchQuery ? '검색 결과가 없습니다' : '선택 가능한 멤버가 없습니다'}
              </p>
              {searchQuery && (
                <p className="text-sm mt-2">다른 검색어를 시도해보세요</p>
              )}
            </div>
          ) : (
            <div className="p-2">
              {filteredMembers.map((member) => (
                <Button
                  key={member.id}
                  variant="ghost"
                  className={cn(
                    "w-full h-auto p-4 mb-2 justify-start",
                    value === member.id && "bg-accent border-2 border-primary"
                  )}
                  onClick={() => handleMemberSelect(member.id)}
                >
                  <div className="flex flex-col items-start w-full">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium text-base">{member.nickname}</span>
                      {value === member.id && (
                        <div className="w-2 h-2 bg-primary rounded-full" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <span className="px-2 py-1 bg-muted rounded text-xs">{member.tier}</span>
                      <span>•</span>
                      <span>{member.mainPosition}</span>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* 선택된 멤버 정보 (하단 고정) */}
        {selectedMember && (
          <div className="p-4 border-t bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">선택된 멤버</p>
                <p className="font-medium">{selectedMember.nickname}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMemberSelect('')}
              >
                선택 해제
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}