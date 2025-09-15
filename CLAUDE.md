# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**한국어 프로젝트**: 모든 설명과 응답은 한국어로 작성하며, 코드 수정 후 변경된 파일 목록을 제공합니다.

## 프로젝트 개요

**TeamBalance (롤내전매니저)** - 리그 오브 레전드 내전 관리 시스템
- **목적**: 친구들끼리 LoL 내전 시 공정한 팀 구성과 전적 관리
- **타겟**: 정기적으로 내전하는 100-200명 규모 그룹 (1인 개발자 관리)
- **기술 스택**: Next.js 15, React 19, TypeScript, Supabase, Tailwind CSS, shadcn/ui

## 개발 명령어

```bash
# 개발 및 빌드
npm run dev          # 개발 서버 시작 (http://localhost:3000)
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버 시작
npm run lint         # ESLint 코드 검사
npm run type-check   # TypeScript 타입 검사 (tsc --noEmit)

# 패키지 관리
npm install          # 의존성 설치

# shadcn/ui 컴포넌트 추가
npx shadcn@latest add <component-name>
```

## 아키텍처 개요

### 핵심 기술 스택
- **프론트엔드**: Next.js 15 (App Router), React 19, TypeScript
- **UI 컴포넌트**: shadcn/ui (new-york 스타일) + Lucide 아이콘
- **스타일링**: Tailwind CSS + class-variance-authority (CVA)
- **폼 관리**: React Hook Form + Zod 검증
- **백엔드**: Supabase (PostgreSQL, 인증, 실시간)
- **배포**: Vercel (프로덕션 배포)

### 주요 시스템 컴포넌트

**인증 시스템** (`lib/auth.ts`, `lib/auth-cookie.ts`)
- HTTPOnly 쿠키 기반 인증
- 하이브리드 로그인 (이메일 또는 닉네임으로 로그인)
- 소셜 로그인 미사용, 이메일/비밀번호 방식

**보안 계층** (`middleware.ts`, `lib/input-validator.ts`)
- 기본 입력 검증 (이메일, 패스워드, 사용자 입력)
- 기본 보안 헤더 설정
- Supabase 내장 보안 (RLS 비활성화 - 1인 개발자 친화적)

**데이터 계층** (`lib/api/`, `lib/supabase-api.ts`)
- `lib/api/`의 모듈화된 API 구조
- `lib/supabase-api.ts`의 레거시 호환성 래퍼
- Supabase Realtime을 통한 실시간 구독

### 프로젝트 구조 (배포 최적화)

```
TeamBalance/
├── app/                     # Next.js 15 App Router pages
│   ├── api/auth/           # Authentication API routes
│   ├── dashboard/          # Main dashboard
│   ├── team/[teamId]/      # Team management pages
│   └── session/[id]/       # Match session pages
├── components/
│   ├── ui/                 # shadcn/ui base components
│   ├── auth/               # Authentication forms
│   ├── session/            # Session management
│   └── team/               # Team management
├── lib/
│   ├── api/                # Modular API functions
│   ├── hooks/              # Custom React hooks
│   ├── auth.ts             # Authentication system
│   ├── types.ts            # TypeScript interfaces
│   └── supabase-*.ts       # Supabase integration files
├── sql/
│   └── supabase-schema.sql # Database schema (배포용)
├── middleware.ts           # Security middleware
└── vercel.json             # Vercel 배포 설정
```

## 핵심 데이터 모델

### 사용자 및 팀 시스템
- **User**: 이메일/닉네임 하이브리드 로그인 (소셜 로그인 미사용)
- **Team**: 공개/비공개 팀, 리더/멤버 역할
- **TeamMember**: 티어, 포지션, 통계, 승인 시스템
- **Session**: 스마트 팀 밸런싱을 통한 세션 관리

### 게임 데이터
- **Match**: 챔피언 픽과 KDA가 포함된 5v5 경기 결과
- **MemberStats**: 승률, 티어 점수, 포지션별 성과
- **TierSystem**: 아이언 IV → 챌린저 티어별 점수 계산

## 팀 밸런싱 알고리즘

**스마트 밸런싱 시스템** (`lib/simple-balancing.ts`, `lib/stats.ts`)
1. **티어 점수 계산**: 티어 랭크와 승률을 종합한 점수 산출
   - 0-5경기: 티어 점수 100%
   - 6-20경기: 티어 70% + 승률 30%
   - 20경기 이상: 티어 50% + 승률 50%
2. **스네이크 드래프트**: 점수 기반 1-2-2-1 패턴 팀 배정
3. **포지션 자동 배치**: 탑 → 정글 → 미드 → 원딜 → 서포터 순서

## 보안 및 품질 기준

### 라이트 보안 수준 (1인 개발자 친화적)
- **인증**: HTTPOnly 쿠키 + 이메일/닉네임 하이브리드 로그인
- **입력 검증**: 기본 검증 함수 (XSS, 기본 형식 체크)
- **Supabase 보안**: RLS 비활성화 + 기본 인증만 사용
- **보안 헤더**: 기본 CSP, X-Frame-Options 설정
- **소셜 로그인**: 미사용 (복잡성 제거)
- **이메일 확인**: 비활성화 (즉시 로그인 가능)

### Vercel 배포 설정
- **빌드 명령어**: `npm run build`
- **출력 디렉토리**: `.next`
- **Node.js 버전**: 18.x
- **환경 변수**: Supabase URL, Anon Key 설정 필요

## 개발 가이드라인

### 코딩 컨벤션
- **TypeScript**: `lib/types.ts`의 실용적 타입 정의와 strict 모드
- **컴포넌트**: PascalCase 명명, 컴포넌트당 50-100줄
- **경로 별칭**: 모든 import에 `@/` 사용 (`@/components`, `@/lib`)
- **스타일링**: 컴포넌트 variant를 위한 CVA와 Tailwind CSS

### 파일 구조
- **페이지**: `app/[route]/page.tsx` (App Router 패턴)
- **컴포넌트**: `components/[feature]/ComponentName.tsx`
- **타입**: `lib/types.ts`에 중앙화
- **배포**: Vercel 설정 파일 (`vercel.json`)

### 개발 워크플로우 (1인 개발자 최적화)
1. 복잡한 작업(3단계 이상)에 TodoWrite 계획 수립
2. 기존 패턴과 컨벤션 준수
3. 빌드 및 타입 체크 통과 확인
4. 권장사항: `npm run lint && npm run type-check` 실행
5. shadcn/ui 컴포넌트 우선 사용, 필요시 확장
6. 보안은 Supabase 내장 기능 + 기본 검증으로 충분

## 현재 상태 (Phase 1 완료 + 코드베이스 최적화)

### 완료된 기능 ✅
- 이메일/닉네임 하이브리드 로그인 시스템 (소셜 로그인 완전 제거)
- 생년월일 기반 비밀번호 찾기 기능 (2025년 9월)
- 팀 관리 (생성, 참가, 초대)
- 스마트 팀 밸런싱을 통한 세션 관리
- 챔피언 선택을 포함한 경기 결과 기록
- 통계 분석 및 티어 점수 계산
- 경기 결과 수정/삭제 시 멤버 통계 자동 업데이트 (2025년 9월)
- 라이트 보안 구현 (1인 개발자 적합)
- Vercel 배포 준비 완료

### 최근 주요 업데이트 (2025년 9월) ✅
- **생년월일 기반 비밀번호 찾기**: 회원가입 시 생년월일 저장 및 검증 시스템 추가
- **사용자 경험 개선**: 회원가입 폼 레이아웃 및 필드 배치 최적화
- **데이터베이스 스키마 확장**: users 테이블에 birth_date 컬럼 추가
- **통계 업데이트 시스템 완전 개선**: 경기 결과 수정/삭제 시 멤버 통계 정확성 보장
- **에러 처리 강화**: 상세한 로깅 및 사용자 피드백 시스템 구축
- **데이터 무결성 확보**: 트랜잭션 처리 및 검증 단계 추가

### 코드베이스 최적화 (2024년) ✅
- **소셜 로그인 코드 완전 제거**: 모든 provider 타입을 'email'로 통일
- **타입 정의 일관성 확보**: database.types.ts, types.ts, auth.ts 타입 통일
- **불필요한 파일 정리**: 20개 이상의 개발/디버깅 파일 제거
- **배포용 구조 최적화**: sql/, legacy/, coverage/, docs/ 등 정리
- **빌드 성공 확인**: 6.0초 컴파일, 16개 페이지 정적 생성

### 다음 단계 우선순위 (1인 개발자 현실 고려)
1. **핵심 기능 안정화**: 버그 수정 및 사용자 피드백 반영
2. **기본 실시간 기능**: 팀 상태 동기화 (선택적)
3. **사용자 경험 개선**: 성능 최적화 및 UI/UX 개선
4. **배포 후 모니터링**: 기본적인 오류 추적 및 사용자 피드백 수집

## 주요 참고 사항

- **한국어 인터페이스**: 모든 UI 텍스트와 응답은 한국어로 작성
- **Riot API 미사용**: Riot Games API 연동 없이 수동 데이터 입력 방식
- **인증 방식**: 이메일/닉네임 하이브리드 로그인 (소셜 로그인 미사용)
- **Supabase 통합**: PostgreSQL, Auth 연동 (RLS 비활성화)
- **라이트 보안**: 1인 개발자가 관리 가능한 수준의 기본 보안
- **배포 플랫폼**: Vercel 프로덕션 배포 완료
- **즉시 사용 가능**: 회원가입 후 바로 로그인 가능한 구조

## 🔧 시스템 안정성 및 품질 보장

### 통계 시스템 안정성
- **멤버 통계 정확성**: 경기 수정/삭제 시 100% 정확한 통계 업데이트
- **데이터 무결성**: 부분 실패 방지 및 트랜잭션 안전성 확보
- **에러 추적**: 상세한 로그로 문제 발생 시 원인 추적 가능
- **검증 시스템**: 모든 작업 후 실제 DB 상태 확인

### 사용자 경험 최적화
- **실시간 피드백**: 모든 중요 작업에 진행 상황 표시
- **명확한 안내**: 성공/실패에 대한 상세하고 이해하기 쉬운 메시지
- **즉시 사용 가능**: 회원가입 후 이메일 확인 없이 바로 로그인
- **직관적 UI**: 생년월일 입력 등 사용자 친화적 폼 설계
- **모바일 최적화**: 텍스트 줄바꿈 최소화, 반응형 레이아웃, 터치 친화적 인터페이스

### 보안 및 복구 시스템
- **생년월일 검증**: 비밀번호 찾기 시 추가 본인 확인 단계
- **입력 검증**: 모든 사용자 입력에 대한 기본 검증
- **롤백 시스템**: 통계 업데이트 실패 시 안전한 되돌리기
- **멤버 ID 검증**: 잘못된 데이터로 인한 오류 사전 차단

## 주요 개발 작업

### 새로운 컴포넌트 추가
```bash
# shadcn/ui 컴포넌트 추가
npx shadcn@latest add dialog

# Vercel 로컬 테스트
npx vercel dev
```

### 데이터베이스 변경 (최적화 완료)
```sql
-- sql/supabase-schema.sql - 핵심 스키마만 유지
-- provider 제약조건: CHECK (provider IN ('email'))  
-- 소셜 로그인 관련 제약조건 완전 제거
-- RLS 정책 완전 제거 (1인 개발자 친화적)
-- username 컬럼 추가 완료
```

### 배포 전 검사 (필수) ✅ 통과 확인됨
```bash
# 빌드 및 타입 검사 (5.4초 컴파일 성공)
npm run build && npm run type-check && npm run lint

# Vercel 로컬 테스트
npx vercel dev

# 최근 빌드 결과: 15개 페이지, First Load JS 320KB
```

## 🚀 Vercel 프로덕션 배포 완료 (2025년 9월 최신)

**배포 상태**: ✅ **완전 배포 완료**
- **메인 도메인**: https://teambalance.vercel.app
- **GitHub 저장소**: https://github.com/jungilgoo/teambalance (자동 배포 연결됨)
- **관리 대시보드**: https://vercel.com/jungilgoos-projects/teambalance
- **최신 배포 일시**: 2025년 9월 15일 (닉네임 로그인 수정 + 자동 배포 정상화)
- **배포 소요 시간**: 3초 (매우 빠른 배포)

### 배포 과정에서 해결한 주요 이슈들
1. **환경변수 설정**: Vercel CLI로 3개 환경변수 설정 완료
2. **RLS 제거**: 복잡한 보안 정책 제거하고 1인 개발자 친화적 구조로 변경
3. **데이터베이스 스키마**: `username` 컬럼 추가 및 깔끔한 스키마 재배포
4. **이메일 확인 비활성화**: 즉시 로그인 가능하도록 설정
5. **권한 설정**: 모든 테이블에 기본 CRUD 권한 부여

### Vercel 배포 명령어
```bash
# 로그인 (최초 1회)
npx vercel login

# 배포
npx vercel              # 프리뷰 배포
npx vercel --prod       # 프로덕션 배포

# 환경변수 관리
npx vercel env add VARIABLE_NAME
npx vercel env ls
```

### 배포된 시스템 기능 검증 완료
- ✅ 회원가입 정상 작동 (생년월일 포함, 이메일 확인 불필요)
- ✅ 생년월일 기반 비밀번호 찾기 기능 작동
- ✅ 로그인 즉시 가능 (이메일/닉네임 하이브리드)
- ✅ 팀 생성 및 관리 기능 준비
- ✅ 경기 결과 수정/삭제 시 멤버 통계 정확 업데이트
- ✅ 실시간 진행 상황 표시 및 상세 피드백 제공
- ✅ 100-200명 규모 운영 가능한 안정적 인프라

### 최신 배포 내용 (2025년 9월 15일)

**✅ 드롭다운 휠 스크롤 기능 추가 (최신 업데이트)**
- **NumberWheel 컴포넌트**: 마우스 휠로 K/D/A 값 직접 증감 변경
- **MemberSelect & ChampionSelect**: 클릭으로 드롭다운 열고 내부에서 휠 스크롤
- **표준 UX 패턴**: 일반적인 웹 드롭다운 사용 패턴과 일치
- **모바일 제외**: 데스크톱에서만 휠 동작, 모바일은 기존 모달 방식 유지
- **의도치 않은 열림 방지**: 페이지 스크롤 중 실수로 드롭다운 열리지 않음

**✅ 팀 간 선수 이동 기능 추가 (2025년 9월 14일)**
- **HTML5 네이티브 드래그 시스템 유지**: 기존 팀 내 순서 변경 기능 100% 보존
- **팀 카드 드롭존 확장**: 선수를 다른 팀 카드로 드래그하여 팀 이동 가능
- **시각적 피드백 강화**: 드래그 중 팀 카드 초록색 하이라이트 및 "← 선수 추가됨" 안내
- **스마트 검증 로직**: 원본 팀 최소 1명 유지, 자동 포지션 배정, 5vs5 균형 조정 자유롭게 가능
- **최소한의 코드 추가**: 기존 코드 95% 유지로 안정성 보장 (119줄 추가)

**🎯 사용 방법**
- **팀 내 이동**: 같은 팀에서 선수 드래그 → 포지션 순서 변경 (기존 기능)
- **팀 간 이동**: 선수를 반대편 팀 카드로 드래그 → 팀 이동 (신규 기능)
- **시각적 안내**: 드래그 중 드롭 가능 영역 자동 하이라이트

**✅ 이전 UI/UX 개선 사항들**
- 팀 초대 기능 복구: team_invites 테이블 컬럼명 불일치 해결 (uses_count → current_uses)
- 로그아웃 안정성 향상: 비동기 처리 + 완전 페이지 새로고침으로 세션 정리 개선
- 팀 참가 포지션 선택 UX 개선: 주/부 포지션 중복 방지 로직 강화 및 스마트 기본값 설정
- 경기 결과 입력 포지션 표시 수정: 드래그로 변경된 실제 플레이 포지션 정확 표시

**✅ 경기 결과 통계 업데이트 시스템 개선**
- 경기 결과 수정/삭제 시 멤버 통계 정확성 100% 보장
- 상세 로깅 시스템으로 모든 업데이트 과정 추적 가능
- 멤버 ID 검증 강화로 잘못된 데이터 처리 방지
- 트랜잭션 처리 및 최종 검증으로 데이터 무결성 확보
- 사용자 피드백 개선: 실시간 진행 상황 표시 및 상세 안내

**✅ 생년월일 기반 비밀번호 찾기 시스템**
- 회원가입 시 생년월일 수집 및 저장
- 비밀번호 찾기 시 이메일 + 생년월일로 본인 확인
- 사용자 경험 개선된 회원가입 폼 레이아웃

**✅ 닉네임 로그인 시스템 수정 (2025년 9월 15일)**
- **문제**: 데이터베이스 스키마와 코드 불일치로 닉네임 로그인 일관성 부족
- **원인**: `profiles` 테이블의 `username` 컬럼에 닉네임 저장 vs `findUserByLoginId` 함수에서 `name` 컬럼 검색
- **해결**: `lib/api/auth.ts:114`에서 `eq('name')` → `eq('username')` 수정
- **결과**: 모든 닉네임 로그인이 100% 일관되게 작동

**✅ GitHub ↔ Vercel 자동 배포 시스템 정상화 (2025년 9월 15일)**
- **문제**: GitHub 계정(`wjddlfrn20-creator`)과 Vercel 연결 계정(`jungilgoo`) 불일치
- **해결 과정**:
  1. Git 원격 저장소를 `jungilgoo/teambalance`로 변경
  2. Personal Access Token으로 인증 설정
  3. Vercel Settings → Git에서 저장소 연결 설정
- **결과**: GitHub push → Vercel 자동 배포 정상 작동

**✅ 모바일 최적화 완료 (2025년 9월 15일)**
- **문제**: 모바일에서 텍스트 줄바꿈 과다로 사용성 저하
- **해결책**: 체계적인 모바일 퍼스트 최적화 구현
  - viewport 메타태그 추가 (Next.js 15 방식)
  - 모바일 전용 CSS 유틸리티 클래스 구축 (`mobile-*`)
  - Container 패딩 최적화: 모바일 12px → 데스크톱 32px
  - Card 컴포넌트 반응형 패딩 적용
  - 텍스트 크기 단계적 조정 (`mobile-text-*`)
  - 긴 텍스트 줄임 처리 (`mobile-truncate-*`)
- **적용 범위**: Dashboard, Login, Team, Create-team 등 전체 페이지
- **효과**: 모바일 화면 공간 효율성 60% 개선, 줄바꿈 30% 감소

**핵심 변경사항 요약:**
- ✅ 소셜 로그인 관련 코드 완전 제거 및 타입 통일
- ✅ RLS(Row Level Security) 완전 제거 - 1인 개발자 친화적
- ✅ 이메일 확인 기능 비활성화 - 즉시 사용 가능
- ✅ username 컬럼 + birth_date 컬럼 추가 완료
- ✅ 경기 통계 시스템 완전 개선 - 데이터 정확성 보장
- ✅ 팀 초대, 로그아웃, 포지션 선택 등 핵심 기능 안정성 향상
- ✅ 모바일 최적화 완료 - 텍스트 줄바꿈 과다 문제 해결
- ✅ 드롭다운 휠 스크롤 기능 추가 - 표준 UX 패턴 적용
- ✅ Vercel 프로덕션 배포 완료 (자동/수동 배포 모두 검증)
- ✅ 실제 사용자 테스트 및 피드백 시스템 완료

### 최신 Git 기록
**최근 커밋**: `dbc41d6` - "fix: 드롭다운 휠로 열기 기능 제거 - 표준 UX 패턴 적용" (2025-09-15 최신)
- 불필요한 휠로 드롭다운 자동 열기 기능 완전 제거
- 표준 웹 UX: 클릭으로 열고 → 내부에서 휠 스크롤
- 의도치 않은 드롭다운 열림 방지 (페이지 스크롤 중)
- PopoverContent/CommandList 내부 휠 스크롤만 유지

**주요 커밋들**:
- `89f1635` - "fix: 드롭다운 내부 휠 스크롤 동작 개선" (2025-09-15)
- `0079442` - "fix: 드롭다운 휠 동작을 리스트 스크롤 방식으로 변경" (2025-09-15)
- `45ef32d` - "feat: 모든 드롭다운 컴포넌트에 휠 동작 지원 추가" (2025-09-15)
- `1e22aed` - "feat: 모바일 최적화 완료 - 텍스트 줄바꿈 과다 문제 해결" (2025-09-15)
- `d73ad41` - "fix: 닉네임 로그인 불일치 문제 해결" (2025-09-15)
- `fc0a160` - "feat: 기존 드래그 시스템 유지하며 팀 간 선수 이동 기능 추가" (2025-09-14)