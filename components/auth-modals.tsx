"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/language-context"
import { signUp, signIn } from "@/lib/supabase"
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
  onSwitchMode: (mode: "signin" | "create") => void
}

export function AuthModals({ mode, onClose, onSuccess, onSwitchMode }: AuthModalsProps) {
  const { t } = useLanguage()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string; general?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showVerificationMessage, setShowVerificationMessage] = useState(false)

  const resetForm = () => {
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setErrors({})
    setShowVerificationMessage(false)
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

    const result = await signIn(email, password)
    
    if (result.success) {
      resetForm()
      onSuccess()
    } else {
      if (result.error === 'email_not_verified') {
        setErrors({ general: t.pleaseVerifyEmail })
      } else {
        setErrors({ general: result.error })
      }
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

    const result = await signUp(email, password)
    
    if (result.success) {
      if (result.needsVerification) {
        // Show verification message
        setShowVerificationMessage(true)
      } else {
        // Auto-verified (shouldn't happen with email confirmation enabled)
        resetForm()
        onSuccess()
      }
    } else {
      setErrors({ general: result.error })
    }
    
    setIsSubmitting(false)
  }

  const handleSwitchMode = () => {
    resetForm()
    onSwitchMode(mode === "signin" ? "create" : "signin")
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  // Show verification message screen
  if (showVerificationMessage) {
    return (
      <Dialog open={mode !== null} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="border-[#e5e5e5] bg-white p-8 sm:max-w-[400px]">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-center text-xl font-light tracking-wide text-[#1a1a1a]">
              {t.checkYourEmail}
            </DialogTitle>
            <DialogDescription className="mt-4 text-center text-sm font-light text-[#6e6e73]">
              {t.emailVerificationSent}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleClose}
              className="mt-4 h-11 w-full rounded-full bg-[#1a1a1a] text-sm font-light tracking-wide text-white transition-all hover:bg-[#333]"
            >
              {t.close}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={mode !== null} onOpenChange={(open) => !open && handleClose()}>
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
