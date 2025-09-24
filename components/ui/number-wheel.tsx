'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'
import { MobileNumberInput } from '@/components/ui/mobile-number-input'
import { useIsMobile } from '@/lib/hooks/useMediaQuery'

interface NumberWheelProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  placeholder?: string
  className?: string
}

export function NumberWheel({
  value,
  onChange,
  min = 0,
  max = 30,
  placeholder,
  className = ''
}: NumberWheelProps) {
  const isMobile = useIsMobile()
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(value.toString())
  const [touchStart, setTouchStart] = useState<number | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // 이전 값을 추적하기 위한 ref 추가
  const lastSavedValueRef = useRef(value)

  // 숫자 목록 생성
  const numbers = Array.from({ length: max - min + 1 }, (_, i) => min + i)

  // value prop 변경 시 inputValue 동기화
  useEffect(() => {
    if (!isEditing) {
      setInputValue(value.toString())
      lastSavedValueRef.current = value
    }
  }, [value, isEditing])

  // 값 저장 함수를 useCallback으로 메모이제이션
  const saveValue = useCallback(() => {
    const num = parseInt(inputValue)
    if (!isNaN(num) && num >= min && num <= max) {
      if (num !== lastSavedValueRef.current) {
        onChange(num)
        lastSavedValueRef.current = num
      }
    } else {
      // 유효하지 않은 값이면 원래 값으로 되돌림
      setInputValue(lastSavedValueRef.current.toString())
    }
  }, [inputValue, min, max, onChange])

  // blur 이벤트 처리 (Tab 키로 이동 시)
  const handleBlur = useCallback(() => {
    if (isEditing) {
      saveValue()
      setIsEditing(false)
      setIsOpen(false)
    }
  }, [isEditing, saveValue])

  // 클릭 외부 영역 감지 - blur와 중복되지 않도록 수정
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 현재 컴포넌트 외부를 클릭했을 때만 처리
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (isEditing) {
          // setTimeout을 사용하여 blur 이벤트와 충돌 방지
          setTimeout(() => {
            if (document.activeElement !== inputRef.current) {
              saveValue()
              setIsEditing(false)
            }
          }, 0)
        }
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isEditing, saveValue])

  // 키보드 입력 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveValue()
      setIsEditing(false)
      setIsOpen(false)
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setInputValue(lastSavedValueRef.current.toString())
      setIsEditing(false)
      setIsOpen(false)
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

  // 마우스 휠 처리
  const handleWheel = (e: React.WheelEvent) => {
    if (e.cancelable) {
      e.preventDefault()
    }

    // 편집 중일 때는 휠 동작 비활성화
    if (isEditing) return

    const delta = e.deltaY > 0 ? 1 : -1
    const newValue = Math.min(max, Math.max(min, value + delta))
    if (newValue !== value) {
      onChange(newValue)
      setInputValue(newValue.toString())
      lastSavedValueRef.current = newValue
    }

    // 시각적 피드백
    if (!isOpen) {
      setIsOpen(true)
      setTimeout(() => setIsOpen(false), 300)
    }
  }

  // 터치 이벤트 처리
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null || !isOpen || isEditing) return
    
    if (e.cancelable) {
      e.preventDefault()
    }
    
    const touchY = e.touches[0].clientY
    const diff = touchStart - touchY
    
    if (Math.abs(diff) > 20) {
      const delta = diff > 0 ? 1 : -1
      const newValue = Math.min(max, Math.max(min, value + delta))
      if (newValue !== value) {
        onChange(newValue)
        setInputValue(newValue.toString())
        lastSavedValueRef.current = newValue
      }
      setTouchStart(touchY)
    }
  }

  const handleTouchEnd = () => {
    setTouchStart(null)
  }

  // 드롭다운 토글
  const toggleDropdown = () => {
    if (isEditing) return
    setIsOpen(!isOpen)
  }

  // 포커스 처리
  const handleFocus = () => {
    setIsEditing(true)
    setIsOpen(false)
    // 포커스 시 전체 선택
    setTimeout(() => {
      inputRef.current?.select()
    }, 0)
  }

  // 숫자 선택
  const selectNumber = (num: number) => {
    onChange(num)
    setInputValue(num.toString())
    lastSavedValueRef.current = num
    setIsOpen(false)
  }

  // 모바일에서는 + / - 버튼 사용
  if (isMobile) {
    return (
      <MobileNumberInput
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        placeholder={placeholder}
        className={className}
      />
    )
  }

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className={`
          flex items-center justify-between 
          w-16 h-9 px-3 py-1
          bg-white dark:bg-gray-800 
          border border-gray-200 dark:border-gray-700
          rounded-md text-sm
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
          ${isEditing ? 'ring-2 ring-blue-500 border-blue-500' : 'cursor-pointer hover:border-gray-300 dark:hover:border-gray-600'}
          transition-all duration-200
        `}
        onClick={toggleDropdown}
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`
            w-full bg-transparent outline-none text-center
            ${isEditing ? 'cursor-text' : 'cursor-pointer pointer-events-none'}
          `}
        />
        {!isEditing && (
          <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </div>

      {/* 드롭다운 목록 */}
      {isOpen && !isEditing && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 z-50 w-16 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-40 overflow-y-auto"
        >
          {numbers.map((num) => (
            <div
              key={num}
              onClick={() => selectNumber(num)}
              className={`
                px-3 py-1 text-sm text-center cursor-pointer
                ${value === num ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
                transition-colors duration-150
              `}
            >
              {num}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}