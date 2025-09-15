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
import { champions, searchChampions } from '@/lib/champions'

interface ChampionSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  className?: string
}

export function ChampionSelect({
  value = '',
  onValueChange,
  placeholder = '챔피언 선택...',
  className
}: ChampionSelectProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Command>
          <CommandInput placeholder="챔피언 검색..." />
          <CommandEmpty>챔피언을 찾을 수 없습니다.</CommandEmpty>
          <CommandList>
            <CommandGroup>
            {champions.map((champion) => (
              <CommandItem
                key={champion}
                value={champion}
                onSelect={(currentValue) => {
                  const selectedChampion = champions.find(c => 
                    c.toLowerCase() === currentValue.toLowerCase()
                  ) || currentValue
                  onValueChange?.(selectedChampion === value ? '' : selectedChampion)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === champion ? "opacity-100" : "opacity-0"
                  )}
                />
                {champion}
              </CommandItem>
            ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}