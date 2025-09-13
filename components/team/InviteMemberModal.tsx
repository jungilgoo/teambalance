'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TeamInvite } from '@/lib/types'
import { createTeamInvite, getTeamInvites } from '@/lib/supabase-api'
import { Plus, Clock, Users, ExternalLink, RefreshCw } from 'lucide-react'

interface InviteMemberModalProps {
  teamId: string
  currentUserId: string
  teamName: string
  isTeamLeader: boolean
}

export default function InviteMemberModal({ teamId, currentUserId, teamName, isTeamLeader }: InviteMemberModalProps) {
  const [open, setOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [existingInvites, setExistingInvites] = useState<TeamInvite[]>([])
  const [newInvite, setNewInvite] = useState<TeamInvite | null>(null)
  const [expiresInHours, setExpiresInHours] = useState<number>(24)
  const [maxUses, setMaxUses] = useState<string>('')

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      loadExistingInvites()
    }
  }

  const loadExistingInvites = async () => {
    try {
      const invites = await getTeamInvites(teamId)
      setExistingInvites(invites.filter(invite => 
        invite.isActive && new Date() < new Date(invite.expiresAt)
      ))
    } catch (error) {
      console.error('초대 목록 로드 실패:', error)
    }
  }

  const handleCreateInvite = async () => {
    setIsCreating(true)
    try {
      const maxUsesNumber = maxUses ? parseInt(maxUses) : undefined
      const invite = await (createTeamInvite as any)(teamId, currentUserId, maxUsesNumber, expiresInHours)
      setNewInvite(invite)
      loadExistingInvites()
    } catch (error) {
      console.error('초대 링크 생성 실패:', error)
      alert('초대 링크 생성에 실패했습니다.')
    } finally {
      setIsCreating(false)
    }
  }


  const formatExpiresAt = (date: Date) => {
    const now = new Date()
    const expires = new Date(date)
    const diffHours = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60))
    
    if (diffHours <= 0) return '만료됨'
    if (diffHours < 24) return `${diffHours}시간 후 만료`
    const diffDays = Math.ceil(diffHours / 24)
    return `${diffDays}일 후 만료`
  }

  const getInviteLink = (inviteCode: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}/join-team?code=${inviteCode}`
  }

  if (!isTeamLeader) {
    return (
      <Button variant="outline" className="w-full" disabled>
        <Plus className="w-4 h-4 mr-2" />
        멤버 초대하기 (리더 전용)
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          멤버 초대하기
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            팀 멤버 초대
          </DialogTitle>
          <DialogDescription>
            초대 링크를 생성하여 새로운 멤버를 {teamName}에 초대하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 새 초대 링크 생성 */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">새 초대 링크 생성</Label>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="expires" className="text-sm">만료 시간</Label>
                <Select 
                  value={expiresInHours.toString()} 
                  onValueChange={(value) => setExpiresInHours(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1시간</SelectItem>
                    <SelectItem value="6">6시간</SelectItem>
                    <SelectItem value="24">24시간</SelectItem>
                    <SelectItem value="168">7일</SelectItem>
                    <SelectItem value="720">30일</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="maxUses" className="text-sm">최대 사용 횟수</Label>
                <Input
                  id="maxUses"
                  type="number"
                  placeholder="무제한"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  min="1"
                  max="100"
                />
              </div>
            </div>

            <Button onClick={handleCreateInvite} disabled={isCreating} className="w-full">
              {isCreating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  초대 링크 생성
                </>
              )}
            </Button>

            {/* 새로 생성된 초대 링크 */}
            {newInvite && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="mb-3">
                  <span className="text-sm font-medium text-green-800">✅ 초대 링크가 생성되었습니다!</span>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-green-700 block mb-1">
                      초대 링크 (클릭하여 전체 선택)
                    </label>
                    <input
                      type="text"
                      value={getInviteLink(newInvite.inviteCode)}
                      readOnly
                      onClick={(e) => {
                        const input = e.target as HTMLInputElement
                        input.select()
                        input.setSelectionRange(0, 99999)
                      }}
                      className="w-full p-3 text-sm border border-green-300 rounded bg-white font-mono cursor-pointer hover:bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    <p className="text-xs text-green-600 mt-1">
                      💡 링크를 클릭하면 자동으로 선택됩니다. Ctrl+C로 복사하세요.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-green-700 block mb-1">
                      초대 코드만 필요한 경우
                    </label>
                    <input
                      type="text"
                      value={newInvite.inviteCode}
                      readOnly
                      onClick={(e) => {
                        const input = e.target as HTMLInputElement
                        input.select()
                        input.setSelectionRange(0, 99999)
                      }}
                      className="w-full p-3 text-sm border border-green-300 rounded bg-white font-mono cursor-pointer hover:bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>

                <div className="text-xs text-green-600 mt-3 flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  {formatExpiresAt(newInvite.expiresAt)}
                  {newInvite.maxUses && (
                    <>
                      <span>•</span>
                      <span>최대 {newInvite.maxUses}회 사용</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 기존 초대 링크들 */}
          {existingInvites.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">활성 초대 링크</Label>
                  <Button variant="ghost" size="sm" onClick={loadExistingInvites}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {existingInvites.map((invite) => (
                    <div key={invite.id} className="p-3 border rounded-lg bg-gray-50">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">코드: {invite.inviteCode}</div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(getInviteLink(invite.inviteCode), '_blank')}
                            title="새 창에서 열기"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        <input
                          type="text"
                          value={getInviteLink(invite.inviteCode)}
                          readOnly
                          onClick={(e) => {
                            const input = e.target as HTMLInputElement
                            input.select()
                            input.setSelectionRange(0, 99999)
                          }}
                          className="w-full p-2 text-xs border rounded bg-white font-mono cursor-pointer hover:bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {formatExpiresAt(invite.expiresAt)}
                          {invite.maxUses && (
                            <>
                              <span>•</span>
                              <span>{invite.currentUses}/{invite.maxUses} 사용</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}