'use client'

import { useState, useEffect } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    mediaQuery.addEventListener('change', handler)

    return () => {
      mediaQuery.removeEventListener('change', handler)
    }
  }, [query])

  // 서버 사이드 렌더링에서는 false 반환
  if (!mounted) {
    return false
  }

  return matches
}

// 자주 사용하는 미디어 쿼리 훅들
export function useIsMobile() {
  return useMediaQuery('(max-width: 768px)')
}

export function useIsTablet() {
  return useMediaQuery('(max-width: 1024px)')
}

export function useIsDesktop() {
  return useMediaQuery('(min-width: 769px)')
}