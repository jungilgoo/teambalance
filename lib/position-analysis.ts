import { Position, TeamMember } from './types'
import { getMemberPositionPreferences, canMemberPlay } from './types'
import { calculateMemberTierScore } from './stats'
import { simpleBalancingAlgorithm, type SimpleBalancingResult } from './simple-balancing'

// 포지션 커버리지 분석 결과
export interface PositionCoverage {
  position: Position
  availableMembers: string[] // member IDs
  coverageScore: number // 0-100, 100이 최적
}

// 팀 구성 가능성 분석 결과
export interface TeamFormationAnalysis {
  canFormCompleteTeam: boolean
  positionCoverage: PositionCoverage[]
  missingPositions: Position[]
  overCoveredPositions: Position[]
  balanceScore: number // 0-100, 100이 완벽한 밸런스
}

// 선택된 멤버들로 완전한 팀(5포지션) 구성이 가능한지 분석
export function analyzeTeamFormation(members: TeamMember[]): TeamFormationAnalysis {
  const positions: Position[] = ['top', 'jungle', 'mid', 'adc', 'support']
  const positionCoverage: PositionCoverage[] = []
  const missingPositions: Position[] = []
  const overCoveredPositions: Position[] = []

  // 각 포지션별 가용성 분석
  for (const position of positions) {
    const coverage = analyzePositionCoverage(position, members)
    positionCoverage.push(coverage)

    if (coverage.availableMembers.length === 0) {
      missingPositions.push(position)
    } else if (coverage.availableMembers.length > 2) {
      overCoveredPositions.push(position)
    }
  }

  // 완전한 팀 구성 가능성 체크
  const canFormCompleteTeam = missingPositions.length === 0

  // 밸런스 점수 계산 (각 포지션의 커버리지 점수 평균)
  const balanceScore = Math.round(
    positionCoverage.reduce((sum, coverage) => sum + coverage.coverageScore, 0) / positions.length
  )

  return {
    canFormCompleteTeam,
    positionCoverage,
    missingPositions,
    overCoveredPositions,
    balanceScore
  }
}

// 특정 포지션의 커버리지 분석
export function analyzePositionCoverage(position: Position, members: TeamMember[]): PositionCoverage {
  const availableMembers: string[] = []

  // 해당 포지션을 플레이할 수 있는 멤버들 찾기
  for (const member of members) {
    if (canMemberPlay(member, position)) {
      availableMembers.push(member.id)
    }
  }

  // 커버리지 점수 계산
  let coverageScore = 0
  
  if (availableMembers.length === 0) {
    coverageScore = 0 // 아무도 플레이할 수 없음
  } else if (availableMembers.length === 1) {
    // 한 명만 가능한 경우
    coverageScore = 85 // 리스크가 있지만 가능
  } else {
    // 여러 명 가능한 경우
    const diversityBonus = Math.min(availableMembers.length * 10, 30)
    coverageScore = Math.min(70 + diversityBonus, 100)
  }

  return {
    position,
    availableMembers,
    coverageScore: Math.round(coverageScore)
  }
}

// 팀 밸런싱을 위한 최적 포지션 할당 추천
export function recommendOptimalPositions(members: TeamMember[]): Record<string, Position> {
  const positions: Position[] = ['top', 'jungle', 'mid', 'adc', 'support']
  const assignments: Record<string, Position> = {}
  const assignedMembers = new Set<string>()
  const assignedPositions = new Set<Position>()

  // 1단계: 해당 포지션만 할 수 있는 멤버들 우선 배정
  for (const position of positions) {
    const exclusiveMembers = members.filter(member => 
      !assignedMembers.has(member.id) &&
      canMemberPlay(member, position) &&
      getMemberPositionPreferences(member).length === 1 &&
      getMemberPositionPreferences(member)[0] === position
    )

    if (exclusiveMembers.length > 0) {
      // 티어 점수가 가장 높은 멤버 선택
      const bestMember = exclusiveMembers.reduce((best, current) => 
        (current.stats.tierScore || 0) > (best.stats.tierScore || 0) ? current : best
      )
      
      assignments[bestMember.id] = position
      assignedMembers.add(bestMember.id)
      assignedPositions.add(position)
    }
  }

  // 2단계: 남은 포지션에 대해 최적 멤버 배정
  for (const position of positions) {
    if (assignedPositions.has(position)) continue

    const availableMembers = members.filter(member => 
      !assignedMembers.has(member.id) && 
      canMemberPlay(member, position)
    )

    if (availableMembers.length > 0) {
      // 티어 점수가 가장 높은 멤버 선택 (메인 포지션 우선)
      const bestMember = availableMembers.reduce((best, current) => {
        const currentScore = current.stats.tierScore || 0
        const bestScore = best.stats.tierScore || 0
        
        // 메인 포지션인 경우 우선권
        const currentIsMain = current.mainPosition === position
        const bestIsMain = best.mainPosition === position
        
        if (currentIsMain && !bestIsMain) return current
        if (!currentIsMain && bestIsMain) return best
        
        return currentScore > bestScore ? current : best
      })
      
      assignments[bestMember.id] = position
      assignedMembers.add(bestMember.id)
      assignedPositions.add(position)
    }
  }

  return assignments
}

// 특정 멤버 조합으로 5v5 팀 구성 시뮬레이션
export function simulateTeamComposition(
  selectedMembers: TeamMember[], 
  teamSize: number = 5
): {
  teams: TeamMember[][]
  positionAssignments: Record<string, Position>[]
  balanceScores: number[]
  feasible: boolean
} {
  if (selectedMembers.length !== teamSize * 2) {
    throw new Error(`${teamSize * 2}명의 멤버가 필요합니다. 현재: ${selectedMembers.length}명`)
  }

  // 전체적인 팀 구성 가능성 먼저 확인
  const overallAnalysis = analyzeTeamFormation(selectedMembers)
  if (!overallAnalysis.canFormCompleteTeam) {
    return {
      teams: [],
      positionAssignments: [],
      balanceScores: [],
      feasible: false
    }
  }

  // 간단한 밸런싱: 티어 점수 기준으로 스네이크 드래프트
  const sortedMembers = [...selectedMembers].sort((a, b) => 
    (b.stats.tierScore || 0) - (a.stats.tierScore || 0)
  )

  const team1: TeamMember[] = []
  const team2: TeamMember[] = []

  // 1-2-2-1-1-2-2-1 패턴으로 배정
  for (let i = 0; i < sortedMembers.length; i++) {
    const teamIndex = Math.floor(i / 2) % 2
    if (i % 4 < 2) {
      if (teamIndex === 0) team1.push(sortedMembers[i])
      else team2.push(sortedMembers[i])
    } else {
      if (teamIndex === 0) team2.push(sortedMembers[i])
      else team1.push(sortedMembers[i])
    }
  }

  // 각 팀의 포지션 할당
  const team1Assignments = recommendOptimalPositions(team1)
  const team2Assignments = recommendOptimalPositions(team2)

  // 각 팀의 밸런스 점수 계산
  const team1Analysis = analyzeTeamFormation(team1)
  const team2Analysis = analyzeTeamFormation(team2)

  return {
    teams: [team1, team2],
    positionAssignments: [team1Assignments, team2Assignments],
    balanceScores: [team1Analysis.balanceScore, team2Analysis.balanceScore],
    feasible: team1Analysis.canFormCompleteTeam && team2Analysis.canFormCompleteTeam
  }
}


// 포지션별 후보 멤버 분석
export interface PositionCandidate {
  memberId: string
  member: TeamMember
  tierScore: number
  isMainPosition: boolean
}

export interface PositionCandidates {
  position: Position
  candidates: PositionCandidate[]
  candidateCount: number
}

// 모든 포지션별 후보 멤버들을 분석하여 반환
export function analyzePositionCandidates(members: TeamMember[]): PositionCandidates[] {
  const positions: Position[] = ['top', 'jungle', 'mid', 'adc', 'support']
  const positionCandidates: PositionCandidates[] = []

  for (const position of positions) {
    const candidates: PositionCandidate[] = []

    for (const member of members) {
      if (canMemberPlay(member, position)) {
        const tierScore = member.stats.tierScore || 0
        const isMainPosition = member.mainPosition === position

        candidates.push({
          memberId: member.id,
          member,
          tierScore,
          isMainPosition
        })
      }
    }

    // 티어 점수 순으로 정렬 (높은 점수부터, 메인 포지션 우선)
    candidates.sort((a, b) => {
      // 메인 포지션 우선
      if (a.isMainPosition && !b.isMainPosition) return -1
      if (!a.isMainPosition && b.isMainPosition) return 1
      // 같은 조건이면 티어 점수로
      return b.tierScore - a.tierScore
    })

    positionCandidates.push({
      position,
      candidates,
      candidateCount: candidates.length
    })
  }

  return positionCandidates
}

// 팀 조합의 포지션별 점수 균형 분석
export interface TeamPositionBalance {
  position: Position
  team1Score: number
  team2Score: number
  scoreDifference: number
  balanceRatio: number // 0~1, 1이 완벽한 균형
}

export function analyzeTeamPositionBalance(
  team1Assignments: Record<string, Position>,
  team2Assignments: Record<string, Position>,
  positionCandidates: PositionCandidates[]
): TeamPositionBalance[] {
  const positions: Position[] = ['top', 'jungle', 'mid', 'adc', 'support']
  const balanceAnalysis: TeamPositionBalance[] = []

  for (const position of positions) {
    // 각 팀에서 이 포지션을 맡은 멤버 찾기
    const team1MemberId = Object.keys(team1Assignments).find(id => team1Assignments[id] === position)
    const team2MemberId = Object.keys(team2Assignments).find(id => team2Assignments[id] === position)

    let team1Score = 0
    let team2Score = 0

    // 해당 포지션의 후보 목록에서 점수 찾기
    const positionData = positionCandidates.find(pc => pc.position === position)
    if (positionData) {
      if (team1MemberId) {
        const candidate = positionData.candidates.find(c => c.memberId === team1MemberId)
        team1Score = candidate?.tierScore || 0
      }
      if (team2MemberId) {
        const candidate = positionData.candidates.find(c => c.memberId === team2MemberId)
        team2Score = candidate?.tierScore || 0
      }
    }

    const scoreDifference = Math.abs(team1Score - team2Score)
    const maxScore = Math.max(team1Score, team2Score)
    const balanceRatio = maxScore > 0 ? 1 - (scoreDifference / maxScore) : 1

    balanceAnalysis.push({
      position,
      team1Score,
      team2Score,
      scoreDifference,
      balanceRatio
    })
  }

  return balanceAnalysis
}

// 팀 조합 평가 결과
export interface TeamCombinationEvaluation {
  team1: TeamMember[]
  team2: TeamMember[]
  team1Assignments: Record<string, Position>
  team2Assignments: Record<string, Position>
  totalScoreDifference: number
  averageScoreDifference: number
  positionBalances: TeamPositionBalance[]
  balanceScore: number // 0~100, 100이 완벽한 균형
  feasible: boolean
}

// 가능한 모든 팀 조합을 생성하고 평가
export function generateAndEvaluateTeamCombinations(members: TeamMember[]): TeamCombinationEvaluation[] {
  if (members.length !== 10) {
    throw new Error('정확히 10명의 멤버가 필요합니다.')
  }

  const positions: Position[] = ['top', 'jungle', 'mid', 'adc', 'support']
  const positionCandidates = analyzePositionCandidates(members)
  
  // 각 포지션별로 후보가 최소 2명 이상인지 확인
  for (const positionData of positionCandidates) {
    if (positionData.candidateCount < 2) {
      return [] // 불가능한 경우 빈 배열 반환
    }
  }

  const evaluations: TeamCombinationEvaluation[] = []
  const maxCombinations = 1000 // 성능을 위한 조합 수 제한

  // 가능한 조합 생성 (휴리스틱 접근)
  const combinations = generateBalancedCombinations(positionCandidates, maxCombinations)

  for (const combination of combinations) {
    const evaluation = evaluateTeamCombination(combination, positionCandidates)
    if (evaluation.feasible) {
      evaluations.push(evaluation)
    }
  }

  // 균형 점수 순으로 정렬 (높은 점수부터)
  evaluations.sort((a, b) => b.balanceScore - a.balanceScore)

  return evaluations
}

// 균형잡힌 조합 생성 (휴리스틱 방식)
interface TeamAssignmentCombination {
  team1Assignments: Record<string, Position>
  team2Assignments: Record<string, Position>
}

function generateBalancedCombinations(
  positionCandidates: PositionCandidates[], 
  maxCount: number
): TeamAssignmentCombination[] {
  const combinations: TeamAssignmentCombination[] = []
  const positions: Position[] = ['top', 'jungle', 'mid', 'adc', 'support']

  // 각 포지션별 상위 후보들을 대상으로 조합 생성
  function backtrack(
    positionIndex: number,
    team1Assignments: Record<string, Position>,
    team2Assignments: Record<string, Position>,
    usedMembers: Set<string>
  ) {
    if (combinations.length >= maxCount) return
    
    if (positionIndex === positions.length) {
      // 모든 포지션이 할당된 경우, 조합 추가
      combinations.push({
        team1Assignments: { ...team1Assignments },
        team2Assignments: { ...team2Assignments }
      })
      return
    }

    const currentPosition = positions[positionIndex]
    const candidates = positionCandidates.find(pc => pc.position === currentPosition)?.candidates || []

    // 현재 포지션에서 가능한 후보 쌍들을 시도
    for (let i = 0; i < Math.min(candidates.length, 4); i++) {
      for (let j = i + 1; j < Math.min(candidates.length, 6); j++) {
        const candidate1 = candidates[i]
        const candidate2 = candidates[j]

        if (usedMembers.has(candidate1.memberId) || usedMembers.has(candidate2.memberId)) {
          continue
        }

        // 팀1에 candidate1, 팀2에 candidate2 할당
        team1Assignments[candidate1.memberId] = currentPosition
        team2Assignments[candidate2.memberId] = currentPosition
        usedMembers.add(candidate1.memberId)
        usedMembers.add(candidate2.memberId)

        backtrack(positionIndex + 1, team1Assignments, team2Assignments, usedMembers)

        // 백트래킹: 할당 해제
        delete team1Assignments[candidate1.memberId]
        delete team2Assignments[candidate2.memberId]
        usedMembers.delete(candidate1.memberId)
        usedMembers.delete(candidate2.memberId)

        // 팀1에 candidate2, 팀2에 candidate1 할당 (순서 바꿔서 시도)
        team1Assignments[candidate2.memberId] = currentPosition
        team2Assignments[candidate1.memberId] = currentPosition
        usedMembers.add(candidate1.memberId)
        usedMembers.add(candidate2.memberId)

        backtrack(positionIndex + 1, team1Assignments, team2Assignments, usedMembers)

        // 백트래킹: 할당 해제
        delete team1Assignments[candidate2.memberId]
        delete team2Assignments[candidate1.memberId]
        usedMembers.delete(candidate1.memberId)
        usedMembers.delete(candidate2.memberId)
      }
    }
  }

  backtrack(0, {}, {}, new Set())
  return combinations
}

// 특정 조합을 평가
function evaluateTeamCombination(
  combination: TeamAssignmentCombination,
  positionCandidates: PositionCandidates[]
): TeamCombinationEvaluation {
  const { team1Assignments, team2Assignments } = combination

  // 할당된 멤버들로 팀 구성
  const team1: TeamMember[] = []
  const team2: TeamMember[] = []
  
  for (const memberId of Object.keys(team1Assignments)) {
    const member = positionCandidates
      .flatMap(pc => pc.candidates)
      .find(c => c.memberId === memberId)?.member
    if (member) team1.push(member)
  }
  
  for (const memberId of Object.keys(team2Assignments)) {
    const member = positionCandidates
      .flatMap(pc => pc.candidates)
      .find(c => c.memberId === memberId)?.member
    if (member) team2.push(member)
  }

  // 기본 검증: 각 팀이 정확히 5명, 모든 포지션 할당되었는지 확인
  const feasible = team1.length === 5 && team2.length === 5 && 
                  Object.keys(team1Assignments).length === 5 && 
                  Object.keys(team2Assignments).length === 5

  if (!feasible) {
    return {
      team1, team2, team1Assignments, team2Assignments,
      totalScoreDifference: Infinity,
      averageScoreDifference: Infinity,
      positionBalances: [],
      balanceScore: 0,
      feasible: false
    }
  }

  // 포지션별 균형 분석
  const positionBalances = analyzeTeamPositionBalance(team1Assignments, team2Assignments, positionCandidates)
  
  // 전체 점수 차이 계산
  const totalScoreDifference = positionBalances.reduce((sum, pb) => sum + pb.scoreDifference, 0)
  const averageScoreDifference = totalScoreDifference / positionBalances.length
  
  // 균형 점수 계산 (0~100)
  const averageBalanceRatio = positionBalances.reduce((sum, pb) => sum + pb.balanceRatio, 0) / positionBalances.length
  const balanceScore = Math.round(averageBalanceRatio * 100)

  return {
    team1,
    team2,
    team1Assignments,
    team2Assignments,
    totalScoreDifference,
    averageScoreDifference,
    positionBalances,
    balanceScore,
    feasible: true
  }
}

// 최적화된 팀 밸런싱 메인 함수
export interface OptimizedTeamBalancingResult {
  success: boolean
  bestCombination: TeamCombinationEvaluation | null
  alternativeCombinations: TeamCombinationEvaluation[]
  message: string
  positionAnalysis?: PositionCandidates[]
}

export function optimizedTeamBalancing(members: TeamMember[]): OptimizedTeamBalancingResult {
  try {
    if (members.length !== 10) {
      return {
        success: false,
        bestCombination: null,
        alternativeCombinations: [],
        message: `정확히 10명이 필요합니다. 현재: ${members.length}명`
      }
    }

    console.log('단순 밸런싱 알고리즘 시작')

    // 새로운 단순 밸런싱 알고리즘 실행
    const simpleResult = simpleBalancingAlgorithm(members)
    
    if (!simpleResult.success) {
      return {
        success: false,
        bestCombination: null,
        alternativeCombinations: [],
        message: simpleResult.message
      }
    }

    // 단순 알고리즘 결과를 기존 형식으로 변환
    const convertedResult = convertSimpleAlgorithmResult(simpleResult)
    
    console.log(`단순 밸런싱 성공: 점수차이 ${simpleResult.scoreDifference}점`)

    return {
      success: true,
      bestCombination: convertedResult,
      alternativeCombinations: [], // 단순 알고리즘은 단일 최적해 제공
      message: simpleResult.message
    }

  } catch (error) {
    console.error('팀 밸런싱 오류:', error)
    return {
      success: false,
      bestCombination: null,
      alternativeCombinations: [],
      message: `밸런싱 중 오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
    }
  }
}

// 단순 알고리즘 결과를 기존 형식으로 변환
function convertSimpleAlgorithmResult(result: SimpleBalancingResult): TeamCombinationEvaluation {
  // 포지션별 균형 분석 생성
  const positions: Position[] = ['top', 'jungle', 'mid', 'adc', 'support']
  const positionBalances: TeamPositionBalance[] = []

  for (const position of positions) {
    // 각 팀에서 해당 포지션 담당 선수 찾기
    const team1MemberId = Object.keys(result.team1Assignments).find(id => result.team1Assignments[id] === position)
    const team2MemberId = Object.keys(result.team2Assignments).find(id => result.team2Assignments[id] === position)
    
    const team1Member = team1MemberId ? result.team1.find(m => m.id === team1MemberId) : null
    const team2Member = team2MemberId ? result.team2.find(m => m.id === team2MemberId) : null
    
    const team1Score = team1Member ? calculateMemberTierScore(team1Member) : 0
    const team2Score = team2Member ? calculateMemberTierScore(team2Member) : 0
    const scoreDifference = Math.abs(team1Score - team2Score)
    const maxScore = Math.max(team1Score, team2Score)
    const balanceRatio = maxScore > 0 ? 1 - (scoreDifference / maxScore) : 1

    positionBalances.push({
      position,
      team1Score,
      team2Score,
      scoreDifference,
      balanceRatio
    })
  }

  // 균형 점수 계산
  const averageBalanceRatio = positionBalances.reduce((sum, pb) => sum + pb.balanceRatio, 0) / positionBalances.length
  const balanceScore = Math.round(averageBalanceRatio * 100)

  return {
    team1: result.team1,
    team2: result.team2,
    team1Assignments: result.team1Assignments,
    team2Assignments: result.team2Assignments,
    totalScoreDifference: (result as any).scoreDifference,
    averageScoreDifference: (result as any).scoreDifference / 5,
    positionBalances,
    balanceScore,
    feasible: true
  }
}

// 알고리즘 결과 타입 정의
interface AlgorithmResult {
  team1: Array<{ assignedPosition: Position; [key: string]: unknown }>
  team2: Array<{ assignedPosition: Position; [key: string]: unknown }>
  [key: string]: unknown
}

// 이전 알고리즘 결과를 기존 형식으로 변환 (사용되지 않음)
function convertNewAlgorithmResult(result: AlgorithmResult): TeamCombinationEvaluation {
  // 포지션별 균형 분석 생성
  const positions: Position[] = ['top', 'jungle', 'mid', 'adc', 'support']
  const positionBalances: TeamPositionBalance[] = []

  for (const position of positions) {
    const team1Member = result.team1.find(m => m.assignedPosition === position)
    const team2Member = result.team2.find(m => m.assignedPosition === position)
    
    const team1Score = (team1Member?.positionScore as number) || 0
    const team2Score = (team2Member?.positionScore as number) || 0
    const scoreDifference = Math.abs(team1Score - team2Score)
    const maxScore = Math.max(team1Score, team2Score)
    const balanceRatio = maxScore > 0 ? 1 - (scoreDifference / maxScore) : 1

    positionBalances.push({
      position,
      team1Score,
      team2Score,
      scoreDifference,
      balanceRatio
    })
  }

  // 팀 배치 생성
  const team1Assignments: Record<string, Position> = {}
  const team2Assignments: Record<string, Position> = {}

  result.team1.forEach(member => {
    team1Assignments[(member as any).id] = (member as any).assignedPosition
  })
  
  result.team2.forEach(member => {
    team2Assignments[(member as any).id] = (member as any).assignedPosition
  })

  // 균형 점수 계산
  const averageBalanceRatio = positionBalances.reduce((sum, pb) => sum + pb.balanceRatio, 0) / positionBalances.length
  const balanceScore = Math.round(averageBalanceRatio * 100)

  // 원래 TeamMember 타입으로 변환
  const team1Original: TeamMember[] = (result as any).team1.map((member: any) => ({
    id: member.id,
    teamId: member.teamId,
    userId: member.userId,
    role: member.role,
    joinedAt: member.joinedAt,
    nickname: member.nickname,
    tier: member.tier,
    mainPosition: member.mainPosition,
    subPositions: member.subPositions,
    stats: member.stats
  }))

  const team2Original: TeamMember[] = (result as any).team2.map((member: any) => ({
    id: member.id,
    teamId: member.teamId,
    userId: member.userId,
    role: member.role,
    joinedAt: member.joinedAt,
    nickname: member.nickname,
    tier: member.tier,
    mainPosition: member.mainPosition,
    subPositions: member.subPositions,
    stats: member.stats
  }))

  return {
    team1: team1Original,
    team2: team2Original,
    team1Assignments,
    team2Assignments,
    totalScoreDifference: (result as any).scoreDifference,
    averageScoreDifference: (result as any).scoreDifference / 5,
    positionBalances,
    balanceScore,
    feasible: true
  }
}

// 팀 조합을 기존 형식으로 변환 (기존 코드와의 호환성)
export function convertToLegacyFormat(evaluation: TeamCombinationEvaluation): {
  team1: TeamMember[]
  team2: TeamMember[]
  team1MMR: number
  team2MMR: number
  positionFeasible: boolean
  positionAnalysis: {
    team1Assignments: Record<string, Position>
    team2Assignments: Record<string, Position>
    team1Score: number
    team2Score: number
  }
} {
  // 각 팀의 포지션별 가중 점수 합산하여 계산 (더 정확한 팀 실력 반영)
  let team1TotalWeightedScore = 0
  let team2TotalWeightedScore = 0
  
  for (const positionBalance of evaluation.positionBalances) {
    team1TotalWeightedScore += positionBalance.team1Score
    team2TotalWeightedScore += positionBalance.team2Score
  }
  
  const team1MMR = Math.round(team1TotalWeightedScore / evaluation.positionBalances.length)
  const team2MMR = Math.round(team2TotalWeightedScore / evaluation.positionBalances.length)

  // 포지션별 평균 균형 점수 계산
  const avgBalance = evaluation.positionBalances.reduce((sum, pb) => sum + pb.balanceRatio, 0) / evaluation.positionBalances.length
  const positionScore = Math.round(avgBalance * 100)

  return {
    team1: evaluation.team1,
    team2: evaluation.team2,
    team1MMR,
    team2MMR,
    positionFeasible: evaluation.feasible,
    positionAnalysis: {
      team1Assignments: evaluation.team1Assignments,
      team2Assignments: evaluation.team2Assignments,
      team1Score: positionScore,
      team2Score: positionScore
    }
  }
}

// 포지션 부족 상황에 대한 해결책 제안
export function suggestPositionSolutions(analysis: TeamFormationAnalysis): {
  solutions: string[]
  recommendedRecruitment: Position[]
  alternativeAssignments: Record<string, Position[]>
} {
  const solutions: string[] = []
  const recommendedRecruitment: Position[] = []
  const alternativeAssignments: Record<string, Position[]> = {}

  // 누락된 포지션에 대한 해결책
  for (const missingPosition of analysis.missingPositions) {
    solutions.push(`${missingPosition} 포지션을 할 수 있는 멤버를 추가로 모집하세요.`)
    recommendedRecruitment.push(missingPosition)

    // 다른 포지션 멤버들이 이 포지션을 부포지션으로 추가할 수 있는지 확인
    const potentialCandidates = analysis.positionCoverage
      .filter(coverage => coverage.availableMembers.length > 1)
      .map(coverage => coverage.position)

    if (potentialCandidates.length > 0) {
      solutions.push(
        `또는 ${potentialCandidates.join(', ')} 포지션의 일부 멤버들이 ` +
        `${missingPosition} 포지션을 부포지션으로 추가하는 것을 고려하세요.`
      )
    }
  }

  // 과도하게 집중된 포지션에 대한 제안
  for (const overPosition of analysis.overCoveredPositions) {
    const coverage = analysis.positionCoverage.find(c => c.position === overPosition)
    if (coverage && coverage.availableMembers.length > 2) {
      solutions.push(
        `${overPosition} 포지션에 ${coverage.availableMembers.length}명이 몰려있습니다. ` +
        `일부 멤버들이 다른 포지션을 부포지션으로 추가하면 팀 밸런싱이 개선됩니다.`
      )
    }
  }

  // 전반적인 밸런스가 낮은 경우
  if (analysis.balanceScore < 70) {
    solutions.push(
      `현재 포지션 밸런스 점수가 ${analysis.balanceScore}점입니다. ` +
      `멤버들이 부포지션을 추가하면 팀 구성의 유연성이 향상됩니다.`
    )
  }

  return {
    solutions,
    recommendedRecruitment,
    alternativeAssignments
  }
}