import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// 브라우저 클라이언트 (클라이언트 컴포넌트용)
export function createSupabaseBrowser() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}

// 기본 클라이언트 (기존 코드와의 호환성을 위해)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// 관리자 클라이언트 (서버 사이드 전용)
export function createSupabaseAdmin() {
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// 타입 export
export type { Database }