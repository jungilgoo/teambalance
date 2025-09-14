import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface SignUpFormProps {
  name: string
  email: string
  password: string
  username: string
  birthDate: string
  usernameError: string
  usernameSuggestions: string[]
  error: string
  isLoading: boolean
  onNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onUsernameChange: (value: string) => void
  onBirthDateChange: (value: string) => void
  onSubmit: () => void
  onToggleMode: () => void
  onSelectSuggestion: (suggestion: string) => void
}

const SignUpForm = memo(function SignUpForm({
  name,
  email,
  password,
  username,
  birthDate,
  usernameError,
  usernameSuggestions,
  error,
  isLoading,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onUsernameChange,
  onBirthDateChange,
  onSubmit,
  onToggleMode,
  onSelectSuggestion
}: SignUpFormProps) {
  return (
    <>
      <Input
        type="text"
        placeholder="이름 (실명)"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        className="h-12"
        required
      />
      
      <Input
        type="email"
        placeholder="이메일"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        className="h-12"
        required
      />

      <div className="relative">
        <Input
          type="date"
          value={birthDate}
          onChange={(e) => onBirthDateChange(e.target.value)}
          className="h-12"
          required
          max={new Date().toISOString().split('T')[0]} // 오늘 이후 날짜 선택 방지
        />
        {!birthDate && (
          <label className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
            생년월일
          </label>
        )}
      </div>

      {/* 닉네임 입력 (선택사항) */}
      <div className="space-y-2">
        <Input
          type="text"
          placeholder="게이머 닉네임 (선택사항, 2-20자)"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          className={`h-12 ${usernameError ? 'border-red-500' : ''}`}
        />
        
        {usernameError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {usernameError}
          </p>
        )}

        {/* 닉네임 추천 */}
        {usernameSuggestions.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-gray-500">추천 닉네임:</p>
            <div className="flex flex-wrap gap-1">
              {usernameSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => onSelectSuggestion(suggestion)}
                  className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 rounded-md transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500 dark:text-gray-400">
          닉네임은 회원가입 시 중복 여부가 확인됩니다. (나중에 설정 가능)
        </p>
      </div>

      <Input
        type="password"
        placeholder="비밀번호 (6자 이상)"
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
        className="h-12"
        required
      />

      {/* 개인정보 사용 안내 */}
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        이메일과 생년월일은 비밀번호 찾기에만 사용됩니다.
      </p>

      {/* 전체 에러 메시지 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <Button
        onClick={onSubmit}
        disabled={isLoading}
        className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? '처리 중...' : '회원가입'}
      </Button>

      <div className="text-center space-y-2">
        <button
          onClick={onToggleMode}
          className="text-sm text-blue-600 hover:text-blue-700 block w-full"
        >
          이미 계정이 있으신가요? 로그인
        </button>
      </div>
    </>
  )
})

export default SignUpForm