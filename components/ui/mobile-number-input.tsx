'use client'

import { useState, useRef, useEffect } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface MobileNumberInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  placeholder?: string
  className?: string
  label?: string
}

export function MobileNumberInput({
  value,
  onChange,
  min = 0,
  max = 30,
  placeholder,
  className = '',
  label
}: MobileNumberInputProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(value.toString())
  const inputRef = useRef<HTMLInputElement>(null)

  // value prop 변경 시 inputValue 동기화
  useEffect(() => {
    if (!isEditing) {
      setInputValue(value.toString())
    }
  }, [value, isEditing])

  // 증가 버튼
  const handleIncrement = () => {
    const newValue = Math.min(max, value + 1)
    onChange(newValue)
  }

  // 감소 버튼
  const handleDecrement = () => {
    const newValue = Math.max(min, value - 1)
    onChange(newValue)
  }

  // 키보드 입력 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const num = parseInt(inputValue)
      if (!isNaN(num) && num >= min && num <= max) {
        onChange(num)
      } else {
        // 유효하지 않은 값이면 원래 값으로 되돌림
        setInputValue(value.toString())
      }
      setIsEditing(false)
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      setInputValue(value.toString())
      setIsEditing(false)
      inputRef.current?.blur()
    }
  }

  // 텍스트 입력 처리
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val === '' || /^\d+$/.test(val)) {
      setInputValue(val)
    }
  }

  // 포커스 처리
  const handleFocus = () => {
    setIsEditing(true)
  }

  // 블러 처리
  const handleBlur = () => {
    if (isEditing && inputValue !== value.toString()) {
      const num = parseInt(inputValue)
      if (!isNaN(num) && num >= min && num <= max) {
        onChange(num)
      } else {
        // 유효하지 않은 값이면 원래 값으로 되돌림
        setInputValue(value.toString())
      }
    }
    setIsEditing(false)
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="text-sm font-medium text-muted-foreground">
          {label}
        </label>
      )}

      <div className="flex items-center justify-center">
        <div className="flex flex-col items-center gap-1">
          {/* 증가 버튼 */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-12 p-0"
            onClick={handleIncrement}
            disabled={value >= max}
          >
            <Plus className="w-3 h-3" />
          </Button>

          {/* 숫자 입력 */}
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={placeholder}
              className="text-center h-10 w-16 text-lg font-medium"
            />
            {/* 유효 범위 표시 */}
            <div className="absolute -bottom-5 left-0 right-0 text-xs text-muted-foreground text-center">
              {min}-{max}
            </div>
          </div>

          {/* 감소 버튼 */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-12 p-0"
            onClick={handleDecrement}
            disabled={value <= min}
          >
            <Minus className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}