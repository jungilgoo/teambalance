'use client'

import * as React from 'react'
import { Search, Sword, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { champions } from '@/lib/champions'

interface MobileChampionSelectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
}

export function MobileChampionSelectModal({
  open,
  onOpenChange,
  value = '',
  onValueChange,
  placeholder = '챔피언 선택...'
}: MobileChampionSelectModalProps) {
  const [searchQuery, setSearchQuery] = React.useState('')

  // 검색 필터링
  const filteredChampions = champions.filter(champion =>
    champion.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 챔피언 선택 처리
  const handleChampionSelect = (championName: string) => {
    onValueChange?.(championName === value ? '' : championName)
    onOpenChange(false)
    setSearchQuery('') // 검색어 초기화
  }

  // 모달이 닫힐 때 검색어 초기화
  React.useEffect(() => {
    if (!open) {
      setSearchQuery('')
    }
  }, [open])

  // 챔피언 그룹화 (ㄱ, ㄴ, ㄷ 등으로)
  const groupedChampions = React.useMemo(() => {
    const groups: { [key: string]: string[] } = {}

    filteredChampions.forEach(champion => {
      const firstChar = champion[0]
      if (!groups[firstChar]) {
        groups[firstChar] = []
      }
      groups[firstChar].push(champion)
    })

    return Object.keys(groups)
      .sort()
      .map(key => ({
        letter: key,
        champions: groups[key].sort()
      }))
  }, [filteredChampions])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md mx-auto h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sword className="w-5 h-5" />
            챔피언 선택
          </DialogTitle>
        </DialogHeader>

        {/* 검색 입력 */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="챔피언 이름 검색"
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

        {/* 챔피언 목록 */}
        <div className="flex-1 overflow-y-auto">
          {filteredChampions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Sword className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-center">
                {searchQuery ? '검색 결과가 없습니다' : '챔피언 목록을 불러올 수 없습니다'}
              </p>
              {searchQuery && (
                <p className="text-sm mt-2">다른 검색어를 시도해보세요</p>
              )}
            </div>
          ) : (
            <div className="p-2">
              {searchQuery ? (
                // 검색 중일 때는 그룹화 없이 표시
                <div className="grid grid-cols-2 gap-2">
                  {filteredChampions.map((champion) => (
                    <Button
                      key={champion}
                      variant="outline"
                      className={cn(
                        "h-auto p-3 text-sm",
                        value === champion && "bg-accent border-2 border-primary"
                      )}
                      onClick={() => handleChampionSelect(champion)}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span className="flex-1 text-left">{champion}</span>
                        {value === champion && (
                          <div className="w-2 h-2 bg-primary rounded-full" />
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              ) : (
                // 기본 상태에서는 그룹화해서 표시
                <div className="space-y-4">
                  {groupedChampions.map((group) => (
                    <div key={group.letter}>
                      <div className="sticky top-0 bg-background/95 backdrop-blur py-2 border-b mb-2">
                        <h3 className="font-semibold text-sm text-muted-foreground px-2">
                          {group.letter}
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {group.champions.map((champion) => (
                          <Button
                            key={champion}
                            variant="outline"
                            className={cn(
                              "h-auto p-3 text-sm",
                              value === champion && "bg-accent border-2 border-primary"
                            )}
                            onClick={() => handleChampionSelect(champion)}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <span className="flex-1 text-left">{champion}</span>
                              {value === champion && (
                                <div className="w-2 h-2 bg-primary rounded-full" />
                              )}
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 선택된 챔피언 정보 (하단 고정) */}
        {value && (
          <div className="p-4 border-t bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">선택된 챔피언</p>
                <p className="font-medium text-lg">{value}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleChampionSelect('')}
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