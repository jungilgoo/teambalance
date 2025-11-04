'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MemberCard } from '@/components/ui/member-card'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TeamMember } from '@/lib/types'
import { getPendingJoinRequests, approveJoinRequest, getTeamMembers, kickTeamMember } from '@/lib/supabase-api'
import { rejectJoinRequest, promoteToViceLeader, demoteFromViceLeader } from '@/lib/api/members'
import { deleteTeam, canDeleteTeam } from '@/lib/api/teams'
import { TierBadge } from '@/components/ui/tier-badge'
import { positionNames } from '@/lib/utils'
import {
  UserCheck,
  UserX,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Crown,
  AlertTriangle,
  Trash2,
  Settings,
  Shield,
  UserMinus
} from 'lucide-react'
// import { toast } from 'sonner'

interface TeamManagementModalProps {
  isOpen: boolean
  onClose: () => void
  teamId: string
  currentUserId: string
  isLeader: boolean
  teamName: string
  onMemberUpdate?: () => void
  onTeamDeleted?: () => void
}

interface PendingRequestWithLoading extends TeamMember {
  isProcessing?: boolean
}

export default function TeamManagementModal({
  isOpen,
  onClose,
  teamId,
  currentUserId,
  isLeader,
  teamName,
  onMemberUpdate,
  onTeamDeleted
}: TeamManagementModalProps) {
  const [pendingRequests, setPendingRequests] = useState<PendingRequestWithLoading[]>([])
  const [activeMembers, setActiveMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'members' | 'settings'>('pending')
  
  const [isKicking, setIsKicking] = useState(false)
  const [isDeletingTeam, setIsDeletingTeam] = useState(false)
  const [canDelete, setCanDelete] = useState<{ canDelete: boolean; reason?: string }>({ canDelete: false })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // 승인 대기 요청 로드
  const loadPendingRequests = useCallback(async () => {
    setIsLoading(true)
    try {
      const requests = await getPendingJoinRequests(teamId)
      setPendingRequests(requests.map(req => ({ ...req, isProcessing: false })))
    } catch (error) {
      console.error('승인 대기 요청 로드 오류:', error)
      alert('승인 대기 요청을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [teamId])

  // 활성 멤버 로드
  const loadActiveMembers = useCallback(async () => {
    setIsLoading(true)
    try {
      const members = await getTeamMembers(teamId)
      setActiveMembers(members.filter(member => member.status === 'active'))
    } catch (error) {
      console.error('팀 멤버 로드 오류:', error)
      alert('팀 멤버를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [teamId])

  // 팀 삭제 권한 확인
  const checkDeletePermission = useCallback(async () => {
    if (isLeader) {
      try {
        const result = await canDeleteTeam(teamId, currentUserId)
        setCanDelete(result)
      } catch (error) {
        console.error('팀 삭제 권한 확인 오류:', error)
        setCanDelete({ canDelete: false, reason: '권한 확인 중 오류가 발생했습니다.' })
      }
    }
  }, [teamId, currentUserId, isLeader])

  useEffect(() => {
    if (isOpen) {
      loadPendingRequests()
      loadActiveMembers()
      checkDeletePermission()
    }
  }, [isOpen, teamId, loadActiveMembers, loadPendingRequests, checkDeletePermission])

  // 참가 승인
  const handleApprove = async (memberId: string, nickname: string) => {
    // 로딩 상태 설정
    setPendingRequests(prev => 
      prev.map(req => 
        req.id === memberId ? { ...req, isProcessing: true } : req
      )
    )

    try {
      const result = await approveJoinRequest(memberId, currentUserId)
      
      if (result) {
        alert(`${nickname}님의 참가를 승인했습니다.`)
        
        // 승인된 요청을 목록에서 제거
        setPendingRequests(prev => prev.filter(req => req.id !== memberId))
        
        // 팀 멤버 목록 새로고침
        if (onMemberUpdate) {
          onMemberUpdate()
        }
        loadActiveMembers() // 활성 멤버 목록도 새로고침
      } else {
        alert('승인 처리에 실패했습니다.')
      }
    } catch (error) {
      console.error('승인 처리 오류:', error)
      alert('승인 처리 중 오류가 발생했습니다.')
    } finally {
      // 로딩 상태 해제
      setPendingRequests(prev => 
        prev.map(req => 
          req.id === memberId ? { ...req, isProcessing: false } : req
        )
      )
    }
  }

  // 참가 거절
  const handleReject = async (memberId: string, nickname: string) => {
    // 로딩 상태 설정
    setPendingRequests(prev => 
      prev.map(req => 
        req.id === memberId ? { ...req, isProcessing: true } : req
      )
    )

    try {
      const result = await rejectJoinRequest(
        memberId,
        currentUserId,
        rejectionReason || '리더에 의해 거절됨'
      )
      
      if (result) {
        alert(`${nickname}님의 참가 요청을 거절했습니다.`)
        
        // 거절된 요청을 목록에서 제거
        setPendingRequests(prev => prev.filter(req => req.id !== memberId))
        
        // 거절 사유 초기화
        setRejectionReason('')
        setRejectingUserId(null)
      } else {
        alert('거절 처리에 실패했습니다.')
      }
    } catch (error) {
      console.error('거절 처리 오류:', error)
      alert('거절 처리 중 오류가 발생했습니다.')
    } finally {
      // 로딩 상태 해제
      setPendingRequests(prev => 
        prev.map(req => 
          req.id === memberId ? { ...req, isProcessing: false } : req
        )
      )
    }
  }

  // 멤버 추방 실행 (간단한 confirm 방식)
  const handleKickMember = async (member: TeamMember) => {
    const confirmed = confirm(`${member.nickname}님을 팀에서 추방하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 해당 멤버는 다시 참가 신청을 해야 합니다.`)
    
    if (!confirmed) return

    setIsKicking(true)
    try {
      const result = await kickTeamMember(
        teamId,
        member.userId,
        currentUserId
      )

      if (result) {
        alert(`${member.nickname}님을 팀에서 추방했습니다.`)
        
        // 데이터 새로고침
        await loadActiveMembers()
        if (onMemberUpdate) {
          onMemberUpdate()
        }
      } else {
        alert('작업에 실패했습니다.')
      }
    } catch (error) {
      console.error('멤버 추방 오류:', error)
      alert('멤버 추방 중 오류가 발생했습니다.')
    } finally {
      setIsKicking(false)
    }
  }

  // 부리더 임명
  const handlePromoteToViceLeader = async (member: TeamMember) => {
    const confirmed = confirm(
      `${member.nickname}님을 부리더로 임명하시겠습니까?\n\n` +
      '부리더는 멤버 승인/거절 권한을 갖게 됩니다.'
    )

    if (!confirmed) return

    try {
      const result = await promoteToViceLeader(
        teamId,
        member.userId,
        currentUserId
      )

      if (result.success) {
        alert(result.message)
        await loadActiveMembers()
        if (onMemberUpdate) {
          onMemberUpdate()
        }
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error('부리더 임명 오류:', error)
      alert('부리더 임명 중 오류가 발생했습니다.')
    }
  }

  // 부리더 해임
  const handleDemoteFromViceLeader = async (member: TeamMember) => {
    const confirmed = confirm(
      `${member.nickname}님을 일반 멤버로 변경하시겠습니까?\n\n` +
      '부리더 권한이 제거됩니다.'
    )

    if (!confirmed) return

    try {
      const result = await demoteFromViceLeader(
        teamId,
        member.userId,
        currentUserId
      )

      if (result.success) {
        alert(result.message)
        await loadActiveMembers()
        if (onMemberUpdate) {
          onMemberUpdate()
        }
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error('부리더 해임 오류:', error)
      alert('부리더 해임 중 오류가 발생했습니다.')
    }
  }

  // 팀 해체 실행
  const handleDeleteTeam = async () => {
    if (!canDelete.canDelete) {
      alert(canDelete.reason || '팀을 삭제할 수 없습니다.')
      return
    }

    const confirmed = confirm(
      `정말로 "${teamName}" 팀을 해체하시겠습니까?\n\n` +
      '⚠️ 이 작업은 되돌릴 수 없으며, 다음 데이터가 모두 삭제됩니다:\n' +
      '- 모든 팀 멤버 정보\n' +
      '- 팀 초대 링크\n' +
      '- 세션 및 경기 기록\n' +
      '- 통계 데이터\n\n' +
      '정말로 진행하시겠습니까?'
    )
    
    if (!confirmed) return

    setIsDeletingTeam(true)
    try {
      const result = await deleteTeam(teamId, currentUserId)
      
      if (result.success) {
        alert(result.message)
        onClose()
        if (onTeamDeleted) {
          onTeamDeleted()
        }
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error('팀 삭제 오류:', error)
      alert('팀 삭제 중 오류가 발생했습니다.')
    } finally {
      setIsDeletingTeam(false)
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    
    if (days > 0) {
      return `${days}일 전`
    } else if (hours > 0) {
      return `${hours}시간 전`
    } else {
      return '방금 전'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            팀 관리
          </DialogTitle>
          <DialogDescription>
            팀 참가 승인 및 멤버 관리를 할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            승인 대기 ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'members'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            활성 멤버 ({activeMembers.length})
          </button>
          {isLeader && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              팀 설정
            </button>
          )}
        </div>

        <div className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="ml-2">데이터를 불러오는 중...</span>
            </div>
          )}

          {!isLoading && activeTab === 'pending' && (
            <>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">승인 대기 중인 요청이 없습니다</p>
                  <p className="text-sm">새로운 참가 요청이 있으면 여기에 표시됩니다.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">승인 대기 중 ({pendingRequests.length}명)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingRequests.map((request) => (
                      <div key={request.id} className="space-y-3">
                        <MemberCard
                          member={request}
                          currentUserId={currentUserId}
                          isLeader={isLeader}
                          showActions={true}
                          className="relative"
                        >
                          {/* 승인 대기 중 표시 */}
                          <div className="absolute top-2 right-2 bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">
                            승인 대기
                          </div>

                          {/* 신청 시간 표시 */}
                          <div className="text-xs text-gray-500 mb-2">
                            {formatTimeAgo(request.joinedAt)} 신청
                          </div>

                          {request.joinType === 'public' && (
                            <div className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs mb-3">
                              <AlertCircle className="w-3 h-3" />
                              공개 참가 신청
                            </div>
                          )}

                          {/* 액션 버튼 */}
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleApprove(request.id, request.nickname)}
                              disabled={request.isProcessing}
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            >
                              {request.isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                              ) : (
                                <UserCheck className="w-4 h-4 mr-1" />
                              )}
                              승인
                            </Button>

                            <Button
                              onClick={() => setRejectingUserId(request.id)}
                              disabled={request.isProcessing}
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                            >
                              {request.isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                              ) : (
                                <UserX className="w-4 h-4 mr-1" />
                              )}
                              거절
                            </Button>
                          </div>
                        </MemberCard>

                        {/* 거절 사유 입력 */}
                        {rejectingUserId === request.id && (
                          <Card className="border border-orange-200 bg-orange-50/50">
                            <CardContent className="p-4">
                              <Label htmlFor="rejection-reason" className="text-sm font-medium">
                                거절 사유 (선택사항)
                              </Label>
                              <Input
                                id="rejection-reason"
                                placeholder="거절 사유를 입력하세요..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="mt-2 mb-3"
                              />
                              <div className="flex gap-2 justify-end">
                                <Button
                                  onClick={() => {
                                    setRejectingUserId(null)
                                    setRejectionReason('')
                                  }}
                                  size="sm"
                                  variant="outline"
                                >
                                  취소
                                </Button>
                                <Button
                                  onClick={() => handleReject(request.id, request.nickname)}
                                  size="sm"
                                  variant="destructive"
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  거절 확인
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {!isLoading && activeTab === 'members' && (
            <>
              {activeMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">활성 멤버가 없습니다</p>
                  <p className="text-sm">팀에 참가한 활성 멤버가 표시됩니다.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4 text-green-600" />
                    <span className="font-medium">활성 멤버 ({activeMembers.length}명)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeMembers.map((member) => (
                      <MemberCard
                        key={member.id}
                        member={member}
                        currentUserId={currentUserId}
                        isLeader={isLeader}
                        showActions={isLeader && member.role !== 'leader' && member.userId !== currentUserId}
                      >
                        {/* 리더 전용 관리 버튼 (자신 제외, 리더 제외) */}
                        {isLeader && member.role !== 'leader' && member.userId !== currentUserId && (
                          <div className="space-y-2">
                            {/* 부리더 임명/해임 버튼 */}
                            {member.role === 'member' && (
                              <Button
                                onClick={() => handlePromoteToViceLeader(member)}
                                variant="outline"
                                size="sm"
                                className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              >
                                <Shield className="w-4 h-4 mr-2" />
                                부리더 임명
                              </Button>
                            )}

                            {member.role === 'vice_leader' && (
                              <Button
                                onClick={() => handleDemoteFromViceLeader(member)}
                                variant="outline"
                                size="sm"
                                className="w-full text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                              >
                                <UserMinus className="w-4 h-4 mr-2" />
                                부리더 해임
                              </Button>
                            )}

                            {/* 추방 버튼 */}
                            <Button
                              onClick={() => handleKickMember(member)}
                              variant="ghost"
                              size="sm"
                              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={isKicking}
                            >
                              {isKicking ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <Trash2 className="w-4 h-4 mr-2" />
                              )}
                              추방
                            </Button>
                          </div>
                        )}
                      </MemberCard>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {!isLoading && activeTab === 'settings' && isLeader && (
            <>
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-4 h-4 text-gray-600" />
                  <span className="font-medium">팀 설정</span>
                </div>

                {/* 팀 해체 섹션 */}
                <Card className="border border-red-200 bg-red-50/50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-red-900 mb-2">
                          팀 해체 (위험)
                        </h3>
                        <p className="text-red-700 mb-4">
                          팀을 완전히 삭제합니다. 이 작업은 되돌릴 수 없으며, 모든 멤버 정보, 세션 기록, 통계 데이터가 영구적으로 삭제됩니다.
                        </p>
                        
                        {!canDelete.canDelete && canDelete.reason && (
                          <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mb-4">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-yellow-600" />
                              <span className="text-sm text-yellow-800 font-medium">해체 불가</span>
                            </div>
                            <p className="text-sm text-yellow-700 mt-1">{canDelete.reason}</p>
                          </div>
                        )}

                        <Button
                          onClick={handleDeleteTeam}
                          variant="destructive"
                          disabled={!canDelete.canDelete || isDeletingTeam}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {isDeletingTeam ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              팀 해체 중...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-2" />
                              &ldquo;{teamName}&rdquo; 팀 해체하기
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            닫기
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  )
}