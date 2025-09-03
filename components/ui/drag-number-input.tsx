'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface DragNumberInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  className?: string
  placeholder?: string
}

export function DragNumberInput({
  value,
  onChange,
  min = 0,
  max = 99,
  className,
  placeholder
}: DragNumberInputProps) {
  const [isDragging, setIsDragging] = React.useState(false)
  const [dragStartY, setDragStartY] = React.useState(0)
  const [dragStartValue, setDragStartValue] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return // 왼쪽 마우스 버튼만
    
    setIsDragging(true)
    setDragStartY(e.clientY)
    setDragStartValue(value)
    
    // 전역 마우스 이벤트 리스너 추가
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
    
    // 텍스트 선택 방지
    e.preventDefault()
  }

  const handleGlobalMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    
    const deltaY = dragStartY - e.clientY // Y축 반전 (위로 드래그하면 증가)
    const sensitivity = 5 // 5px마다 1씩 변경
    const delta = Math.floor(deltaY / sensitivity)
    const newValue = Math.max(min, Math.min(max, dragStartValue + delta))
    
    if (newValue !== value) {
      onChange(newValue)
    }
  }

  const handleGlobalMouseUp = () => {
    setIsDragging(false)
    document.removeEventListener('mousemove', handleGlobalMouseMove)
    document.removeEventListener('mouseup', handleGlobalMouseUp)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || 0
    const clampedValue = Math.max(min, Math.min(max, newValue))
    onChange(clampedValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      onChange(Math.min(max, value + 1))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      onChange(Math.max(min, value - 1))
    }
  }

  React.useEffect(() => {
    // 컴포넌트 언마운트 시 이벤트 리스너 정리
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [handleGlobalMouseMove, handleGlobalMouseUp])

  return (
    <input
      ref={inputRef}
      type="number"
      value={value || ''}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
      min={min}
      max={max}
      placeholder={placeholder}
      className={cn(
        "flex h-8 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        isDragging && "cursor-ns-resize select-none",
        className
      )}
      style={{
        cursor: isDragging ? 'ns-resize' : 'default'
      }}
    />
  )
}