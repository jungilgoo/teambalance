// ============================================================================
// TeamBalance API - 통합 내보내기
// ============================================================================

// 팀 관련 API
export {
  getTeamById,
  createTeam,
  getPublicTeams,
  searchPublicTeams,
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
  updateMatchByMatchId,
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

export type { Team, TeamMember, User, Match } from '../types'