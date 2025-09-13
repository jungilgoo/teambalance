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
- 팀 관리 (생성, 참가, 초대)
- 스마트 팀 밸런싱을 통한 세션 관리
- 챔피언 선택을 포함한 경기 결과 기록
- 통계 분석 및 티어 점수 계산
- 라이트 보안 구현 (1인 개발자 적합)
- Vercel 배포 준비 완료

### 최근 코드베이스 최적화 (2024년) ✅
- **소셜 로그인 코드 완전 제거**: 모든 provider 타입을 'email'로 통일
- **타입 정의 일관성 확보**: database.types.ts, types.ts, auth.ts 타입 통일
- **불필요한 파일 정리**: 20개 이상의 개발/디버깅 파일 제거
- **배포용 구조 최적화**: sql/, legacy/, coverage/, docs/ 등 정리
- **빌드 성공 확인**: 5.4초 컴파일, 15개 페이지 정적 생성

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

## 🚀 Vercel 프로덕션 배포 완료 (2025년 1월)

**배포 상태**: ✅ **완전 배포 완료**
- **프로덕션 URL**: https://teambalance-cw88w9m62-jungilgoos-projects.vercel.app
- **관리 대시보드**: https://vercel.com/jungilgoos-projects/teambalance
- **배포 일시**: 2025년 1월 13일

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
- ✅ 회원가입 정상 작동 (이메일 확인 불필요)
- ✅ 로그인 즉시 가능
- ✅ 팀 생성 및 관리 기능 준비
- ✅ 100-200명 규모 운영 가능한 인프라

**핵심 변경사항 요약:**
- ✅ 소셜 로그인 관련 코드 완전 제거 및 타입 통일
- ✅ RLS(Row Level Security) 완전 제거 - 1인 개발자 친화적
- ✅ 이메일 확인 기능 비활성화 - 즉시 사용 가능
- ✅ username 컬럼 추가 - 하이브리드 로그인 지원
- ✅ Vercel 프로덕션 배포 완료
- ✅ 실제 사용자 테스트 완료