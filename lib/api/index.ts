// ============================================================================
// TeamBalance API - 통합 내보내기
// ============================================================================

// 팀 관련 API
export {
  getTeamById,
  createTeam,
  getPublicTeams,
  searchPublicTeams,
  generateInviteCode,
  createTeamInvite,
  getTeamByInviteCode,
  getTeamInvites
} from './teams'

// 멤버 관리 API
export {
  getTeamMembers,
  addTeamMember,
  joinPublicTeam,
  getUserTeams,
  requestToJoinTeam,
  getPendingJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  kickTeamMember,
  updateMemberTier,
  updateMemberPositions,
  joinTeamByInviteCode,
  getMemberWithUser,
  getMemberNickname,
  calculateWinRate
} from './members'

// 세션/매치 관리 API  
export {
  createSession,
  updateSession,
  getSession,
  updateSessionResult,
  saveMatchResult,
  updateMatchResult,
  getMatchesByTeamId,
  getMatchBySessionId,
  deleteMatchResult,
  getRecentTeamActivities,
  getMemberMVPCount,
  getTeamMVPRanking,
  getTopRankings,
  getCurrentStreaks,
  getAllMemberStreaks
} from './sessions'

// 인증 관련 API
export {
  checkEmailExists,
  checkUsernameExists,
  validateUsername,
  findUserByLoginId,
  updateUserProfile,
  suggestUsernames,
  getUserById,
  tierNames,
  positionNames
} from './auth'

// ============================================================================
// 타입 재내보내기 (호환성 유지)
// ============================================================================

export type { Team, TeamMember, User, Match, TeamInvite } from '../types'