'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { MobileMemberSelectModal } from '@/components/ui/mobile-member-select-modal'
import { useIsMobile } from '@/lib/hooks/useMediaQuery'
import { TeamMember } from '@/lib/types'

interface MemberSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  className?: string
  members: TeamMember[]
  excludeMembers?: string[] // 선택에서 제외할 멤버 ID들
}

export function MemberSelect({
  value = '',
  onValueChange,
  placeholder = '멤버 선택...',
  className,
  members,
  excludeMembers = []
}: MemberSelectProps) {
  const [open, setOpen] = React.useState(false)
  const isMobile = useIsMobile()

  // 선택 가능한 멤버들 (제외 목록 필터링)
  const availableMembers = members.filter(member =>
    !excludeMembers.includes(member.id)
  )

  // 현재 선택된 멤버 찾기
  const selectedMember = members.find(member => member.id === value)

  // 휠 이벤트 처리
  const handleWheel = React.useCallback((e: React.WheelEvent) => {
    if (availableMembers.length === 0 || isMobile) return

    e.preventDefault()

    const currentIndex = availableMembers.findIndex(member => member.id === value)
    const delta = e.deltaY > 0 ? 1 : -1

    let newIndex = currentIndex + delta
    if (newIndex < 0) newIndex = availableMembers.length - 1
    if (newIndex >= availableMembers.length) newIndex = 0

    const newMember = availableMembers[newIndex]
    if (newMember && onValueChange) {
      onValueChange(newMember.id)
    }
  }, [availableMembers, value, onValueChange, isMobile])

  // 모바일에서는 모달 사용, 데스크톱에서는 드롭다운 사용
  if (isMobile) {
    return (
      <>
        <Button
          variant="outline"
          className={cn("justify-between", className)}
          onClick={() => setOpen(true)}
        >
          {selectedMember ? selectedMember.nickname : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
        <MobileMemberSelectModal
          open={open}
          onOpenChange={setOpen}
          value={value}
          onValueChange={onValueChange}
          members={members}
          excludeMembers={excludeMembers}
          placeholder={placeholder}
        />
      </>
    )
  }

  return (
    <div onWheel={handleWheel}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("justify-between", className)}
          >
            {selectedMember ? selectedMember.nickname : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Command>
          <CommandInput placeholder="멤버 검색..." />
          <CommandEmpty>멤버를 찾을 수 없습니다.</CommandEmpty>
          <CommandList>
            <CommandGroup>
            {availableMembers.map((member) => (
              <CommandItem
                key={member.id}
                value={member.nickname}
                onSelect={(currentValue) => {
                  // 닉네임으로 검색된 경우 실제 멤버 ID 찾기
                  const foundMember = availableMembers.find(m =>
                    m.nickname.toLowerCase() === currentValue.toLowerCase()
                  )
                  const selectedValue = foundMember?.id || ''
                  onValueChange?.(selectedValue === value ? '' : selectedValue)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === member.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <span className="font-medium">{member.nickname}</span>
                  <span className="text-xs text-muted-foreground">
                    {member.tier} • {member.mainPosition}
                  </span>
                </div>
              </CommandItem>
            ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    </div>
  )
}