import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ForgotPasswordWithBirthFormProps {
  email: string
  birthDate: string
  newPassword: string
  confirmPassword: string
  error: string
  isLoading: boolean
  onEmailChange: (value: string) => void
  onBirthDateChange: (value: string) => void
  onNewPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  onSubmit: () => void
  onBack: () => void
}

const ForgotPasswordWithBirthForm = memo(function ForgotPasswordWithBirthForm({
  email,
  birthDate,
  newPassword,
  confirmPassword,
  error,
  isLoading,
  onEmailChange,
  onBirthDateChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  onBack
}: ForgotPasswordWithBirthFormProps) {
  return (
    <>
      <Input
        type="email"
        placeholder="가입 시 사용한 이메일"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        className="h-12"
        required
      />

      <Input
        type="date"
        placeholder="생년월일"
        value={birthDate}
        onChange={(e) => onBirthDateChange(e.target.value)}
        className="h-12"
        required
        max={new Date().toISOString().split('T')[0]}
      />

      <div className="border-t pt-4 mt-4 space-y-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          새 비밀번호를 설정하세요
        </p>
        
        <Input
          type="password"
          placeholder="새 비밀번호 (6자 이상)"
          value={newPassword}
          onChange={(e) => onNewPasswordChange(e.target.value)}
          className="h-12"
          required
        />

        <Input
          type="password"
          placeholder="새 비밀번호 확인"
          value={confirmPassword}
          onChange={(e) => onConfirmPasswordChange(e.target.value)}
          className="h-12"
          required
        />
      </div>

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
        {isLoading ? '처리 중...' : '비밀번호 재설정'}
      </Button>

      <div className="text-center">
        <button
          onClick={onBack}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          ← 로그인으로 돌아가기
        </button>
      </div>
    </>
  )
})

export default ForgotPasswordWithBirthForm