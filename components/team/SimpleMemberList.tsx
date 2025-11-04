'use client'

import { TeamMember } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Crown, Shield, UserMinus, Trash2, Loader2 } from 'lucide-react'

interface SimpleMemberListProps {
  members: TeamMember[]
  currentUserId: string
  isLeader: boolean
  isKicking: boolean
  onPromoteToViceLeader: (member: TeamMember) => void
  onDemoteFromViceLeader: (member: TeamMember) => void
  onKickMember: (member: TeamMember) => void
}

export function SimpleMemberList({
  members,
  currentUserId,
  isLeader,
  isKicking,
  onPromoteToViceLeader,
  onDemoteFromViceLeader,
  onKickMember
}: SimpleMemberListProps) {
  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div
          key={member.id}
          className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {/* 멤버 정보 */}
          <div className="flex items-center gap-3 flex-1">
            {/* 역할 아이콘 */}
            <div className="flex-shrink-0">
              {member.role === 'leader' && (
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Crown className="w-4 h-4 text-white" />
                </div>
              )}
              {member.role === 'vice_leader' && (
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
              )}
              {member.role === 'member' && (
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-600">
                    {member.nickname.substring(0, 1)}
                  </span>
                </div>
              )}
            </div>

            {/* 이름과 티어 */}
            <div className="flex-1">
              <div className="font-medium text-gray-900">{member.nickname}</div>
              <div className="text-sm text-gray-500">
                {member.tier.replace('_', ' ').toUpperCase()}
              </div>
            </div>
          </div>

          {/* 액션 버튼 (리더만, 자신 제외, 리더 제외) */}
          {isLeader && member.role !== 'leader' && member.userId !== currentUserId && (
            <div className="flex items-center gap-2">
              {/* 부리더 임명/해임 버튼 */}
              {member.role === 'member' && (
                <Button
                  onClick={() => onPromoteToViceLeader(member)}
                  variant="outline"
                  size="sm"
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                >
                  <Shield className="w-4 h-4 mr-1" />
                  부리더 임명
                </Button>
              )}

              {member.role === 'vice_leader' && (
                <Button
                  onClick={() => onDemoteFromViceLeader(member)}
                  variant="outline"
                  size="sm"
                  className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                >
                  <UserMinus className="w-4 h-4 mr-1" />
                  부리더 해임
                </Button>
              )}

              {/* 추방 버튼 */}
              <Button
                onClick={() => onKickMember(member)}
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
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
