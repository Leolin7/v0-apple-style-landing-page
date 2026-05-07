"use client"

import { useState } from "react"
import { useLanguage } from "@/lib/language-context"
import { supabase } from "@/lib/supabase"
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
  onModeChange: (mode: "signin" | "create") => void
}

export function AuthModals({ mode, onClose, onSuccess, onModeChange }: AuthModalsProps) {
  const { t } = useLanguage()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string; general?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signUpSuccess, setSignUpSuccess] = useState(false)

  const resetForm = () => {
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setErrors({})
    setSignUpSuccess(false)
  }

  const clearErrors = () => {
    if (Object.keys(errors).length > 0) {
      setErrors({})
    }
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSignIn = async () => {
    const newErrors: typeof errors = {}

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      newErrors.email = t.emailRequired
    } else if (!validateEmail(normalizedEmail)) {
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

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (error) {
        console.log("[v0] Supabase signIn error:", error.message, error)
        
        // Map Supabase errors to user-friendly messages
        let errorMessage = t.signInFailed
        if (error.message.toLowerCase().includes("invalid login credentials")) {
          errorMessage = t.invalidCredentials
        } else if (error.message.toLowerCase().includes("email not confirmed")) {
          errorMessage = t.emailNotConfirmed
        }
        
        setErrors({ general: errorMessage })
        setIsSubmitting(false)
        return
      }

      console.log("[v0] Supabase signIn success:", data)

      // Verify user exists
      const { data: userData, error: userError } = await supabase.auth.getUser()
      
      if (userError || !userData.user) {
        console.log("[v0] Failed to get user after sign in:", userError)
        setErrors({ general: t.signInFailed })
        setIsSubmitting(false)
        return
      }

      console.log("[v0] User verified:", userData.user.email)
      
      resetForm()
      onSuccess()
    } catch (err) {
      console.error("[v0] Unexpected error during signIn:", err)
      setErrors({ general: t.signInFailed })
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

    try {
      // Get the site URL for email redirect
      const siteUrl = typeof window !== "undefined" ? window.location.origin : ""
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: siteUrl,
        },
      })

      if (error) {
        console.error("[v0] Supabase signUp error:", error.message, error)
        setErrors({ general: error.message || t.signUpFailed })
        setIsSubmitting(false)
        return
      }

      console.log("[v0] Supabase signUp success:", data)
      
      // Show "Check your email" message
      setSignUpSuccess(true)
    } catch (err) {
      console.error("[v0] Unexpected error during signUp:", err)
      setErrors({ general: t.signUpFailed })
    }
    
    setIsSubmitting(false)
  }

  const handleSwitchMode = () => {
    resetForm()
    onModeChange(mode === "signin" ? "create" : "signin")
  }

  return (
    <Dialog open={mode !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-[#E3E3E3] bg-[#FAFAF8] p-8 sm:max-w-[400px]">
        {/* Success state after signup */}
        {signUpSuccess && mode === "create" ? (
          <>
            <DialogHeader className="pb-6">
              <DialogTitle className="text-center text-xl font-light tracking-wide text-[#222222]">
                {t.checkYourEmail}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Check your email to confirm your account
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-6 py-4">
              <svg
                className="h-16 w-16 text-[#34c759]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
              <p className="text-center text-sm font-light text-[#77777D]">
                {email}
              </p>
              <button
                onClick={() => {
                  resetForm()
                  onClose()
                }}
                className="mt-2 h-11 w-full rounded-full bg-[#222222] text-sm font-light tracking-wide text-white transition-all hover:bg-[#333]"
              >
                {t.close}
              </button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="pb-6">
              <DialogTitle className="text-center text-xl font-light tracking-wide text-[#222222]">
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
                onChange={(e) => {
                  setEmail(e.target.value)
                  clearErrors()
                }}
                placeholder={t.email}
                className="h-11 w-full rounded-full border border-[#E3E3E3] bg-white px-5 text-sm font-light text-[#222222] placeholder-[#9A9AA0] transition-colors focus:border-[#CFCFCF] focus:outline-none"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  clearErrors()
                }}
                placeholder={t.password}
                className="h-11 w-full rounded-full border border-[#E3E3E3] bg-white px-5 text-sm font-light text-[#222222] placeholder-[#9A9AA0] transition-colors focus:border-[#CFCFCF] focus:outline-none"
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
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    clearErrors()
                  }}
                  placeholder={t.confirmPassword}
                  className="h-11 w-full rounded-full border border-[#E3E3E3] bg-white px-5 text-sm font-light text-[#222222] placeholder-[#9A9AA0] transition-colors focus:border-[#CFCFCF] focus:outline-none"
                />
                {errors.confirm && (
                  <p className="mt-1 text-xs text-red-500">{errors.confirm}</p>
                )}
              </div>
            )}

            <button
              onClick={mode === "signin" ? handleSignIn : handleCreateAccount}
              disabled={isSubmitting}
              className="mt-2 h-11 w-full rounded-full bg-[#222222] text-sm font-light tracking-wide text-white transition-all hover:bg-[#333] disabled:opacity-50"
            >
              {mode === "signin" ? t.enterButton : t.createMySpaceButton}
            </button>
          </div>

              {/* Switch mode link */}
              <p className="text-center text-sm font-light text-[#9A9AA0]">
                {mode === "signin" ? t.noSpace : t.haveSpace}{" "}
                <button
                  onClick={handleSwitchMode}
                  className="text-[#222222] underline underline-offset-2 transition-colors hover:text-[#77777D]"
                >
                  {mode === "signin" ? t.createMySpace : t.enterMySpace}
                </button>
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
