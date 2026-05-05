"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/language-context"
import { createAccount, signIn } from "@/lib/storage"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface AuthModalsProps {
  mode: "signin" | "create" | null
  onClose: () => void
  onSuccess: () => void
}

export function AuthModals({ mode, onClose, onSuccess }: AuthModalsProps) {
  const { t } = useLanguage()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string; general?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setErrors({})
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSignIn = async () => {
    const newErrors: typeof errors = {}

    if (!email.trim()) {
      newErrors.email = t.emailRequired
    } else if (!validateEmail(email)) {
      newErrors.email = t.emailInvalid
    }

    if (!password) {
      newErrors.password = t.passwordRequired
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    setErrors({})

    const result = signIn(email, password)
    
    if (result.success) {
      resetForm()
      onSuccess()
    } else {
      setErrors({ general: result.error })
    }
    
    setIsSubmitting(false)
  }

  const handleCreateAccount = async () => {
    const newErrors: typeof errors = {}

    if (!email.trim()) {
      newErrors.email = t.emailRequired
    } else if (!validateEmail(email)) {
      newErrors.email = t.emailInvalid
    }

    if (!password) {
      newErrors.password = t.passwordRequired
    } else if (password.length < 8) {
      newErrors.password = t.passwordTooShort
    }

    if (password !== confirmPassword) {
      newErrors.confirm = t.passwordsMustMatch
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    setErrors({})

    const result = createAccount(email, password)
    
    if (result.success) {
      resetForm()
      onSuccess()
    } else {
      setErrors({ general: result.error })
    }
    
    setIsSubmitting(false)
  }

  const handleSwitchMode = () => {
    resetForm()
    if (mode === "signin") {
      onClose()
      setTimeout(() => {
        // This will be handled by parent
      }, 100)
    }
  }

  return (
    <Dialog open={mode !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-[#e5e5e5] bg-white p-8 sm:max-w-[400px]">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-center text-xl font-light tracking-wide text-[#1a1a1a]">
            {mode === "signin" ? t.enterMySpace : t.createMySpace}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {mode === "signin" ? "Sign in to your account" : "Create a new account"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Social buttons */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="flex h-11 w-full items-center justify-center gap-3 rounded-full border border-[#e5e5e5] bg-white text-sm font-light text-[#1a1a1a] transition-all hover:border-[#c5c5c5] hover:bg-[#fafafa]"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {t.continueWithGoogle}
            </button>
            <button
              type="button"
              className="flex h-11 w-full items-center justify-center gap-3 rounded-full border border-[#e5e5e5] bg-white text-sm font-light text-[#1a1a1a] transition-all hover:border-[#c5c5c5] hover:bg-[#fafafa]"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              {t.continueWithApple}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-[#e5e5e5]" />
            <span className="text-xs font-light text-[#a1a1a6]">{t.or}</span>
            <div className="h-px flex-1 bg-[#e5e5e5]" />
          </div>

          {/* Form */}
          <div className="flex flex-col gap-4">
            {errors.general && (
              <p className="text-center text-sm text-red-500">{errors.general}</p>
            )}
            
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.email}
                className="h-11 w-full rounded-xl border border-[#e5e5e5] bg-white px-4 text-sm font-light text-[#1a1a1a] placeholder-[#a1a1a6] transition-colors focus:border-[#86868b] focus:outline-none"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.password}
                className="h-11 w-full rounded-xl border border-[#e5e5e5] bg-white px-4 text-sm font-light text-[#1a1a1a] placeholder-[#a1a1a6] transition-colors focus:border-[#86868b] focus:outline-none"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password}</p>
              )}
            </div>

            {mode === "create" && (
              <div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.confirmPassword}
                  className="h-11 w-full rounded-xl border border-[#e5e5e5] bg-white px-4 text-sm font-light text-[#1a1a1a] placeholder-[#a1a1a6] transition-colors focus:border-[#86868b] focus:outline-none"
                />
                {errors.confirm && (
                  <p className="mt-1 text-xs text-red-500">{errors.confirm}</p>
                )}
              </div>
            )}

            <button
              onClick={mode === "signin" ? handleSignIn : handleCreateAccount}
              disabled={isSubmitting}
              className="mt-2 h-11 w-full rounded-full bg-[#1a1a1a] text-sm font-light tracking-wide text-white transition-all hover:bg-[#333] disabled:opacity-50"
            >
              {mode === "signin" ? t.enterButton : t.createMySpaceButton}
            </button>
          </div>

          {/* Switch mode link */}
          <p className="text-center text-sm font-light text-[#a1a1a6]">
            {mode === "signin" ? t.noSpace : t.haveSpace}{" "}
            <button
              onClick={handleSwitchMode}
              className="text-[#1a1a1a] underline underline-offset-2 transition-colors hover:text-[#6e6e73]"
            >
              {mode === "signin" ? t.createMySpace : t.enterMySpace}
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
