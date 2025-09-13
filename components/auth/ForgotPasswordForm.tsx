import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ForgotPasswordFormProps {
  resetEmail: string
  isLoading: boolean
  onEmailChange: (value: string) => void
  onSubmit: () => void
  onBack: () => void
}

const ForgotPasswordForm = memo(function ForgotPasswordForm({
  resetEmail,
  isLoading,
  onEmailChange,
  onSubmit,
  onBack
}: ForgotPasswordFormProps) {
  return (
    <>
      <Input
        type="email"
        placeholder="가입 시 사용한 이메일"
        value={resetEmail}
        onChange={(e) => onEmailChange(e.target.value)}
        className="h-12"
        required
      />

      <Button
        onClick={onSubmit}
        disabled={isLoading}
        className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? '발송 중...' : '재설정 이메일 발송'}
      </Button>

      <div className="text-center">
        <button
          onClick={onBack}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          로그인으로 돌아가기
        </button>
      </div>
    </>
  )
})

export default ForgotPasswordForm