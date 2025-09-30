'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm">
        <Sun className="h-4 w-4 mr-2" />
        <span>다크모드</span>
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="relative"
    >
      {theme === 'light' ? (
        <>
          <Sun className="h-4 w-4 transition-all mr-2" />
          <span>다크모드</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 transition-all mr-2" />
          <span>라이트모드</span>
        </>
      )}
      <span className="sr-only">테마 전환</span>
    </Button>
  )
}
