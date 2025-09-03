# Supabase 마이그레이션 가이드

이 문서는 롤내전매니저 프로젝트를 localStorage 기반 모크 데이터에서 Supabase 기반 실제 데이터베이스로 마이그레이션하는 전체 과정을 설명합니다.

## 📋 마이그레이션 개요

### 완료된 작업 ✅
- **Phase 1**: Supabase 환경 설정 및 패키지 설치
- **Phase 2**: 데이터베이스 스키마 생성 (7개 테이블 + RLS 정책)
- **Phase 3**: 인증 시스템을 Supabase Auth로 완전 교체
- **Phase 4**: 데이터 레이어를 Supabase API로 마이그레이션
- **Phase 5**: 실시간 기능 구현 (Realtime + Broadcast)

### 다음 단계 🚧
- **Phase 6**: 실제 Supabase 프로젝트 설정 및 배포
- **Phase 7**: 기존 컴포넌트들의 API 호출 업데이트
- **Phase 8**: 통합 테스트 및 검증

## 🏗️ 생성된 파일 구조

```
lib/
├── supabase.ts           # Supabase 클라이언트 설정
├── database.types.ts     # TypeScript 타입 정의 (자동 생성 예정)
├── auth.ts              # Supabase Auth 기반 인증 시스템
├── supabase-api.ts      # 모든 데이터 API 함수들
├── realtime.ts          # 실시간 기능 구현
├── mock-data.ts         # 기존 모크 데이터 (호환성 유지)
└── types.ts             # 기존 TypeScript 타입들

supabase-schema.sql       # 데이터베이스 스키마 생성 SQL
supabase-migration-guide.md  # 이 문서
```

## 🚀 Supabase 프로젝트 설정 가이드

### 1. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. 프로젝트 이름: `teambalance` (또는 원하는 이름)
3. 비밀번호 설정 (데이터베이스 접근용)

### 2. 데이터베이스 스키마 생성

Supabase 대시보드의 SQL Editor에서 `supabase-schema.sql` 파일 내용을 실행:

```sql
-- supabase-schema.sql 파일의 전체 내용을 복사하여 실행
-- 총 7개 테이블 + 인덱스 + 트리거 + RLS 정책이 생성됩니다.
```

### 3. 환경 변수 설정

Supabase 프로젝트의 Settings > API에서 다음 정보를 복사하여 `.env.local` 업데이트:

```env
# .env.local 파일 업데이트
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. OAuth 공급자 설정

Supabase 대시보드의 Authentication > Providers에서:
- **Google**: OAuth 앱 설정 (선택사항)
- **Kakao**: OAuth 앱 설정 (권장)
- **이메일**: 개발/테스트용 활성화

## 🔄 컴포넌트 업데이트 가이드

### Import 변경

기존 코드:
```typescript
import { getTeamById, getTeamMembers } from '@/lib/mock-data'
```

새 코드:
```typescript
import { getTeamById, getTeamMembers } from '@/lib/supabase-api'
```

### 비동기 함수 변경

모든 데이터 함수가 `async`로 변경되었으므로 `await` 키워드 추가:

기존:
```typescript
const team = getTeamById(teamId)
const members = getTeamMembers(teamId)
```

새 코드:
```typescript
const team = await getTeamById(teamId)
const members = await getTeamMembers(teamId)
```

### 실시간 기능 추가

팀 멤버 변경사항 구독:
```typescript
import { subscribeToTeamMembers } from '@/lib/realtime'

const channel = subscribeToTeamMembers(teamId, (payload) => {
  // 멤버 변경사항 처리
  console.log('Member changed:', payload)
})

// 컴포넌트 언마운트 시 정리
return () => {
  cleanupChannel(channel)
}
```

## 📝 API 함수 매핑

### 팀 관련

| 기존 함수 (mock-data.ts) | 새 함수 (supabase-api.ts) | 변경사항 |
|--------------------------|----------------------------|----------|
| `getTeamById(id)` | `getTeamById(id)` | async 추가 |
| `getTeamMembers(teamId)` | `getTeamMembers(teamId)` | async 추가 |
| `updateMemberTier(id, tier)` | `updateMemberTier(id, tier)` | async 추가 |
| `createTeamInvite(...)` | `createTeamInvite(...)` | async 추가 |

### 새로 추가된 함수

- `createTeam()`: 새 팀 생성
- `getPublicTeams()`: 공개 팀 목록
- `getUserTeams()`: 사용자가 속한 팀들
- `addTeamMember()`: 팀 멤버 추가
- `createSession()`: 새 세션 생성
- `updateSession()`: 세션 업데이트

## 🔐 인증 시스템 변경사항

### 주요 변경점

1. **소셜 로그인**: OAuth 리다이렉트 방식으로 변경
2. **세션 관리**: Supabase Auth 세션 자동 관리
3. **프로필 생성**: 자동 트리거로 프로필 생성
4. **실시간 인증**: `onAuthStateChange()` 리스너 추가

### 사용법

```typescript
import { socialLogin, onAuthStateChange, getAuthState } from '@/lib/auth'

// 소셜 로그인 (리다이렉트됨)
await socialLogin('kakao')

// 인증 상태 변경 감지
const unsubscribe = onAuthStateChange((authState) => {
  if (authState.isAuthenticated) {
    // 로그인됨
    router.push('/dashboard')
  } else {
    // 로그아웃됨
    router.push('/login')
  }
})
```

## 🚧 필요한 컴포넌트 업데이트

### 1. 로그인 페이지 (`app/login/page.tsx`)
- 소셜 로그인 리다이렉트 처리
- 로딩 상태 표시

### 2. 대시보드 (`app/dashboard/page.tsx`)
- `getUserTeams()` 함수로 팀 목록 로드
- 실시간 팀 변경사항 구독

### 3. 팀 상세 페이지 (`app/team/[teamId]/page.tsx`)
- 팀 멤버 실시간 구독 추가
- 초대 링크 생성/관리 기능

### 4. 세션/경기 페이지
- 세션 상태 실시간 구독
- 경기 결과 실시간 업데이트

## 🧪 테스트 체크리스트

### 인증 테스트
- [ ] 소셜 로그인 (Google/Kakao)
- [ ] 로그아웃
- [ ] 세션 유지 (페이지 새로고침)
- [ ] 자동 프로필 생성

### 팀 관리 테스트
- [ ] 팀 생성
- [ ] 팀 목록 조회
- [ ] 팀 멤버 추가/수정
- [ ] 초대 링크 생성/사용

### 세션/경기 테스트
- [ ] 세션 생성
- [ ] 팀 밸런싱
- [ ] 경기 결과 입력
- [ ] 통계 업데이트

### 실시간 기능 테스트
- [ ] 멤버 추가 시 실시간 업데이트
- [ ] 세션 상태 변경 실시간 동기화
- [ ] 경기 결과 실시간 알림

## 📊 성능 고려사항

### 데이터베이스 최적화
- 인덱스가 올바르게 생성되었는지 확인
- 자주 조회되는 데이터의 쿼리 성능 측정
- RLS 정책이 성능에 미치는 영향 모니터링

### 실시간 기능 최적화
- 불필요한 구독은 정리 (`cleanupChannel()`)
- 실시간 채널 수 제한 (동시에 5-10개 이하)
- 브로드캐스트 메시지 크기 최소화

## 🐛 일반적인 문제 해결

### 인증 관련
**문제**: OAuth 리다이렉트 후 사용자 정보가 없음
**해결**: `onAuthStateChange()` 리스너가 제대로 설정되었는지 확인

### 데이터베이스 관련
**문제**: RLS 정책으로 인한 접근 거부
**해결**: Supabase 대시보드에서 RLS 정책 확인 및 수정

### 실시간 관련
**문제**: 실시간 업데이트가 작동하지 않음
**해결**: Supabase 프로젝트에서 Realtime 기능이 활성화되었는지 확인

## 📈 모니터링 및 로깅

### 개발 환경
```typescript
// 상세한 로깅 활성화
console.log('Auth state:', getAuthState())
console.log('Realtime connection:', channel.state)
```

### 프로덕션 환경
- Supabase 대시보드에서 실시간 연결 수 모니터링
- 데이터베이스 성능 메트릭 확인
- 오류 로그 정기적 검토

## 🎯 다음 개선사항

1. **오프라인 지원**: PWA + 로컬 캐싱
2. **푸시 알림**: 웹 푸시 API 연동
3. **고급 통계**: 복잡한 집계 쿼리 최적화
4. **파일 업로드**: 프로필 사진, 팀 로고 등
5. **다국어 지원**: i18n 라이브러리 도입

---

이 가이드를 통해 롤내전매니저가 완전한 풀스택 애플리케이션으로 업그레이드됩니다. 실제 사용자 데이터를 안전하게 관리하고 실시간으로 협업할 수 있는 강력한 플랫폼이 될 것입니다.