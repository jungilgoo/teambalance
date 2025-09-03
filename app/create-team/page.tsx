'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { getAuthState } from '@/lib/auth'
import { CreateTeamFormData } from '@/lib/types'
import { createTeam, addTeamMember } from '@/lib/supabase-api'
import { Plus } from 'lucide-react'

const createTeamSchema = z.object({
  name: z.string().min(2, '팀 이름은 2글자 이상이어야 합니다').max(20, '팀 이름은 20글자 이하여야 합니다'),
  description: z.string().max(100, '설명은 100글자 이하여야 합니다').optional(),
  isPublic: z.boolean().default(true)
})

export default function CreateTeamPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const form = useForm({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: '',
      description: '',
      isPublic: true
    }
  })

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('팀 생성 페이지: 인증 상태 확인 시작')
        const authState = await getAuthState()
        console.log('팀 생성 페이지: 인증 상태 결과', authState)
        
        if (!authState.isAuthenticated) {
          console.log('팀 생성 페이지: 인증 안됨, 로그인으로 이동')
          router.push('/login')
        } else {
          console.log('팀 생성 페이지: 인증됨, 사용자:', authState.user?.name)
        }
      } catch (error) {
        console.error('팀 생성 페이지: 인증 확인 오류:', error)
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  const onSubmit = async (data: z.infer<typeof createTeamSchema>) => {
    console.log('onSubmit 호출됨!', data) // 디버깅용
    setIsLoading(true)
    try {
      const authState = await getAuthState()
      if (!authState.user) {
        throw new Error('사용자 정보를 찾을 수 없습니다.')
      }

      console.log('팀 생성 시도:', data)
      
      // 1. 팀 생성
      const newTeam = await createTeam(
        data.name,
        authState.user.id,
        data.description,
        data.isPublic
      )

      if (!newTeam) {
        throw new Error('팀 생성에 실패했습니다.')
      }

      console.log('팀 생성 완료:', newTeam)

      // 2. 팀장을 팀 멤버로 추가 (기본 설정으로)
      const teamMember = await addTeamMember(
        newTeam.id,
        authState.user.id,
        authState.user.name || '팀장',
        'gold_i', // 기본 티어
        'mid',    // 기본 주 포지션
        ['top'],  // 기본 부 포지션들
        'leader'  // 역할
      )

      console.log('팀장 추가 완료:', teamMember)
      
      alert(`"${data.name}" 팀이 생성되었습니다!`)
      router.push(`/team/${newTeam.id}`)
    } catch (error: any) {
      console.error('팀 생성 실패:', error)
      alert(`팀 생성에 실패했습니다: ${error.message || '알 수 없는 오류'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* 헤더 */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-6 py-6 flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()} className="rounded-xl -ml-2">
            ← 뒤로가기
          </Button>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">새 팀 생성</h1>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              새로운 팀을 만들어보세요
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              내전을 위한 팀을 생성하고 친구들을 초대해보세요
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">팀 정보</h3>
              <p className="text-gray-600 dark:text-gray-300">팀에 대한 기본 정보를 입력해주세요</p>
            </div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold text-gray-900 dark:text-white">
                        팀 이름 *
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="예: 롤 내전 클럽" 
                          {...field}
                          className="h-12 text-base rounded-xl border-2 focus:border-blue-500"
                        />
                      </FormControl>
                      <FormDescription className="text-gray-600 dark:text-gray-400">
                        다른 사용자들이 검색할 수 있는 팀 이름입니다
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold text-gray-900 dark:text-white">
                        팀 설명
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="팀에 대한 간단한 설명 (선택사항)" 
                          {...field}
                          className="h-12 text-base rounded-xl border-2 focus:border-blue-500"
                        />
                      </FormControl>
                      <FormDescription className="text-gray-600 dark:text-gray-400">
                        팀의 특징이나 활동 내용을 간단히 설명해주세요
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPublic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold text-gray-900 dark:text-white">
                        공개 설정
                      </FormLabel>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3 p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-blue-300 transition-colors">
                          <input
                            type="radio"
                            id="public"
                            checked={field.value === true}
                            onChange={() => field.onChange(true)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <div>
                            <Label htmlFor="public" className="font-medium text-gray-900 dark:text-white cursor-pointer">
                              공개 팀
                            </Label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">다른 사용자들이 검색하고 참가 요청을 보낼 수 있습니다</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3 p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-blue-300 transition-colors">
                          <input
                            type="radio"
                            id="private"
                            checked={field.value === false}
                            onChange={() => field.onChange(false)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <div>
                            <Label htmlFor="private" className="font-medium text-gray-900 dark:text-white cursor-pointer">
                              비공개 팀
                            </Label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">초대를 통해서만 참가할 수 있습니다</p>
                          </div>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-4">
                  <Button 
                    type="submit" 
                    className="w-full h-14 text-base font-semibold rounded-xl" 
                    disabled={isLoading}
                    onClick={() => console.log('버튼 클릭됨!', form.getValues())}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>팀 생성 중...</span>
                      </div>
                    ) : (
                      '팀 생성하기'
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </main>
    </div>
  )
}