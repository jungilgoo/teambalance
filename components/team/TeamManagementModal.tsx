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
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TeamMember } from '@/lib/types'
import { getPendingJoinRequests, approveJoinRequest, rejectJoinRequest, getTeamMembers, kickTeamMember } from '@/lib/supabase-api'
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
  Trash2
} from 'lucide-react'
// import { toast } from 'sonner'

interface TeamManagementModalProps {
  isOpen: boolean
  onClose: () => void
  teamId: string
  currentUserId: string
  onMemberUpdate?: () => void
}

interface PendingRequestWithLoading extends TeamMember {
  isProcessing?: boolean
}

export default function TeamManagementModal({
  isOpen,
  onClose,
  teamId,
  currentUserId,
  onMemberUpdate
}: TeamManagementModalProps) {
  const [pendingRequests, setPendingRequests] = useState<PendingRequestWithLoading[]>([])
  const [activeMembers, setActiveMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'members'>('pending')
  
  const [isKicking, setIsKicking] = useState(false)

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

  useEffect(() => {
    if (isOpen) {
      loadPendingRequests()
      loadActiveMembers()
    }
  }, [isOpen, teamId, loadActiveMembers, loadPendingRequests])

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

                  {pendingRequests.map((request) => (
                    <Card key={request.id} className="border border-gray-200 hover:border-gray-300 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          {/* 신청자 정보 */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-600">
                                  {request.nickname.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg">{request.nickname}</h3>
                                <p className="text-sm text-gray-500">
                                  {formatTimeAgo(request.joinedAt)} 신청
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 mb-3">
                              <TierBadge tier={request.tier} />
                              <div className="text-sm">
                                <span className="font-medium text-blue-600">주포지션:</span> {positionNames[request.mainPosition]}
                              </div>
                              <div className="text-sm">
                                <span className="font-medium text-green-600">부포지션:</span>{' '}
                                {request.subPositions && request.subPositions.length > 0 
                                  ? request.subPositions.map(pos => positionNames[pos]).join(', ')
                                  : '없음'}
                              </div>
                            </div>

                            {request.joinType === 'public' && (
                              <div className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                                <AlertCircle className="w-3 h-3" />
                                공개 참가 신청
                              </div>
                            )}
                          </div>

                          {/* 액션 버튼 */}
                          <div className="flex gap-2 ml-4">
                            <Button
                              onClick={() => handleApprove(request.id, request.nickname)}
                              disabled={request.isProcessing}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              {request.isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <UserCheck className="w-4 h-4" />
                              )}
                              승인
                            </Button>

                            <Button
                              onClick={() => setRejectingUserId(request.id)}
                              disabled={request.isProcessing}
                              size="sm"
                              variant="destructive"
                            >
                              {request.isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <UserX className="w-4 h-4" />
                              )}
                              거절
                            </Button>
                          </div>
                        </div>

                        {/* 거절 사유 입력 */}
                        {rejectingUserId === request.id && (
                          <div className="mt-4 pt-4 border-t">
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
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
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

                  {activeMembers.map((member) => (
                    <Card key={member.id} className="border border-gray-200 hover:border-gray-300 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          {/* 멤버 정보 */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-600">
                                  {member.nickname.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-lg">{member.nickname}</h3>
                                  {member.role === 'leader' && (
                                    <Crown className="w-4 h-4 text-yellow-500" />
                                  )}
                                </div>
                                <p className="text-sm text-gray-500">
                                  {formatTimeAgo(member.joinedAt)} 참가
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 mb-3">
                              <TierBadge tier={member.tier} />
                              <div className="text-sm">
                                <span className="font-medium text-blue-600">주포지션:</span> {positionNames[member.mainPosition]}
                              </div>
                              <div className="text-sm">
                                <span className="font-medium text-green-600">부포지션:</span>{' '}
                                {member.subPositions && member.subPositions.length > 0 
                                  ? member.subPositions.map(pos => positionNames[pos]).join(', ')
                                  : '없음'}
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div>티어점수: <span className="font-medium">{member.stats.tierScore}</span></div>
                              <div>총 {member.stats.totalWins}승 {member.stats.totalLosses}패</div>
                              {member.stats.mvpCount > 0 && (
                                <div>MVP {member.stats.mvpCount}회</div>
                              )}
                            </div>
                          </div>

                          {/* 추방 버튼 (리더가 아니고 자신이 아닌 경우만) */}
                          {member.role !== 'leader' && member.userId !== currentUserId && (
                            <div className="flex items-center ml-4">
                              <Button
                                onClick={() => handleKickMember(member)}
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                disabled={isKicking}
                              >
                                {isKicking ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                                추방
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
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