"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useLanguage } from "@/lib/language-context"
import { getOrdinal, formatElapsedDuration } from "@/lib/translations"
import {
  type TriggerType,
  type SessionStatus,
  loadStats,
  addSession,
  getMostCommonTrigger,
  type UserStats,
  saveSessionToSupabase,
  loadSessionsFromSupabase,
  buildStatsFromSessions,
  checkSupabaseAuth,
  signOutSupabase,
} from "@/lib/storage"
import { MyTimeSheet } from "./my-time-sheet"
import { AuthModals } from "./auth-modals"
import { WorldPresence } from "./world-presence"

type AppStep = "landing" | "time" | "trigger" | "timer" | "complete"

const TIME_OPTIONS = [15, 30, 60] as const

const TRIGGER_KEYS: TriggerType[] = [
  "shortVideos",
  "messages",
  "work",
  "ai",
  "anxiety",
  "boredom",
  "world",
]

export function StayAloneApp() {
  const { language, setLanguage, t } = useLanguage()
  const [step, setStep] = useState<AppStep>("landing")
  const [selectedTime, setSelectedTime] = useState<number>(30)
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerType>("world")
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [pulledAwayCount, setPulledAwayCount] = useState(0)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [visitorCount, setVisitorCount] = useState<number | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [myTimeOpen, setMyTimeOpen] = useState(false)
  const [authMode, setAuthMode] = useState<"signin" | "create" | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [completedElapsedSeconds, setCompletedElapsedSeconds] = useState(0)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimestampRef = useRef<number | null>(null)
  const startDateRef = useRef<Date | null>(null)
  const hasCalledApi = useRef(false)

  // Fetch visitor count
  const fetchVisitorCount = useCallback(async () => {
    if (hasCalledApi.current) return
    hasCalledApi.current = true

    try {
      const response = await fetch("/api/visit")
      if (!response.ok) throw new Error("Failed to fetch")
      const data = await response.json()
      setVisitorCount(data.count)
    } catch {
      setVisitorCount(1337) // Fallback
    }
  }, [])

  useEffect(() => {
    const initAuth = async () => {
      const { isSignedIn: supabaseSignedIn } = await checkSupabaseAuth()
      setIsLoggedIn(supabaseSignedIn)
      
      if (supabaseSignedIn) {
        // Load stats from Supabase
        const { sessions, error } = await loadSessionsFromSupabase()
        if (!error && sessions.length > 0) {
          setStats(buildStatsFromSessions(sessions))
        } else {
          setStats(loadStats()) // Fallback to localStorage
        }
      } else {
        // Not signed in, use localStorage
        setStats(loadStats())
      }
    }
    
    initAuth()
    fetchVisitorCount()
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [fetchVisitorCount])

  // Timer logic
  useEffect(() => {
    if (step === "timer" && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current)
            completeSession(true, false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const startTimer = () => {
    setTimeRemaining(selectedTime * 60)
    setPulledAwayCount(0)
    startTimestampRef.current = Date.now()
    startDateRef.current = new Date()
    setSaveMessage(null)
    setStep("timer")
  }

  const completeSession = async (completed: boolean, isPulledAway: boolean = false) => {
    if (timerRef.current) clearInterval(timerRef.current)
    
    // Calculate actual elapsed time
    const endTimestamp = Date.now()
    const endDate = new Date()
    const startTimestamp = startTimestampRef.current || endTimestamp
    const startDate = startDateRef.current || endDate
    const elapsedMs = endTimestamp - startTimestamp
    const elapsedSeconds = Math.floor(elapsedMs / 1000)
    const elapsedMinutes = Math.floor(elapsedSeconds / 60)
    const selectedDurationSeconds = selectedTime * 60
    
    // Determine status
    let status: SessionStatus
    if (isPulledAway) {
      status = "pulled_away"
    } else if (timeRemaining > 0) {
      status = "finished_early"
    } else {
      status = "completed"
    }
    
    setCompletedElapsedSeconds(elapsedSeconds)
    
    // Check if user is signed in to Supabase
    const { isSignedIn: supabaseSignedIn } = await checkSupabaseAuth()
    
    if (supabaseSignedIn) {
      // Save to Supabase
      const result = await saveSessionToSupabase(
        startDate,
        endDate,
        elapsedSeconds,
        selectedDurationSeconds,
        selectedTrigger,
        status
      )
      
      if (result.success) {
        setSaveMessage(t.savedToMySpace)
        // Reload stats from Supabase
        const { sessions } = await loadSessionsFromSupabase()
        if (sessions.length > 0) {
          setStats(buildStatsFromSessions(sessions))
        }
      } else {
        setSaveMessage(t.couldNotSave)
        // Fallback to localStorage
        const newStats = addSession(
          elapsedMinutes > 0 ? elapsedMinutes : 1,
          selectedTrigger,
          completed && !isPulledAway,
          pulledAwayCount,
          elapsedSeconds
        )
        setStats(newStats)
      }
    } else {
      // Not signed in - use localStorage only
      const newStats = addSession(
        elapsedMinutes > 0 ? elapsedMinutes : 1,
        selectedTrigger,
        completed && !isPulledAway,
        pulledAwayCount,
        elapsedSeconds
      )
      setStats(newStats)
    }
    
    setStep("complete")
    
    // Clear save message after 3 seconds
    if (supabaseSignedIn) {
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

  const handlePulledAway = () => {
    // End the session with pulled_away status
    completeSession(false, true)
  }

  const resetToLanding = () => {
    setStep("landing")
    setSelectedTime(30)
    setSelectedTrigger("world")
    setTimeRemaining(0)
    setPulledAwayCount(0)
    setCompletedElapsedSeconds(0)
    setSaveMessage(null)
    startTimestampRef.current = null
    startDateRef.current = null
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleAuthSuccess = async () => {
    setAuthMode(null)
    setIsLoggedIn(true)
    
    // Load stats from Supabase
    const { sessions, error } = await loadSessionsFromSupabase()
    if (!error && sessions.length > 0) {
      setStats(buildStatsFromSessions(sessions))
    } else {
      setStats(loadStats()) // Fallback to localStorage
    }
    
    setMyTimeOpen(true)
  }

  const handleSignOut = async () => {
    await signOutSupabase()
    setIsLoggedIn(false)
    setMyTimeOpen(false)
    setStats(loadStats()) // Load localStorage stats for signed-out state
  }

  const handleHeaderClick = () => {
    if (isLoggedIn) {
      setMyTimeOpen(true)
    } else {
      setAuthMode("signin")
    }
  }

  // Format completion message with actual elapsed time
  // "This was your 14 minutes 38 seconds" / "这是属于你的 14 分 38 秒"
  const getCompletionMessage = () => {
    const duration = formatElapsedDuration(completedElapsedSeconds, language)
    return `${t.completionPrefix} ${duration}`
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[#fafafa] text-[#1a1a1a]">
      {/* Subtle world presence at bottom - only on landing */}
      {step === "landing" && <WorldPresence />}
      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-50 flex items-center justify-between px-6 pt-6 md:px-10 md:pt-9">
        {/* Language toggle */}
        <button
          onClick={() => setLanguage(language === "en" ? "zh" : "en")}
          className="text-[13px] font-light tracking-[0.03em] text-[#a1a1a6] transition-colors duration-200 hover:text-[#6e6e73]"
        >
          {language === "en" ? "中文" : "EN"}
        </button>

        {/* My Space */}
        <button
          onClick={handleHeaderClick}
          className="text-[13px] font-light tracking-[0.03em] text-[#a1a1a6] transition-colors duration-200 hover:text-[#6e6e73]"
        >
          {t.mySpace}
        </button>
      </header>

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6">
        {/* Landing */}
        {step === "landing" && (
          <div
            className="flex min-h-svh w-full max-w-[1000px] flex-col items-center justify-center text-center md:min-h-screen"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0) translateY(-3vh)" : "translateY(12px) translateY(-3vh)",
              transition: "all 1200ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {/* Counter line - whisper-like */}
            <p
              className="text-[15px] font-light tracking-[0.04em] text-[#a1a1a6] md:text-[16px]"
              style={{
                marginBottom: "clamp(56px, 9vh, 96px)",
                opacity: isVisible ? 0.85 : 0,
                transition: "opacity 1400ms ease 300ms",
              }}
            >
              {visitorCount !== null && (
                <>
                  {getOrdinal(visitorCount, language)}
                  {t.counterSuffix}
                </>
              )}
            </p>

            {/* Stay Alone wordmark - brand mark feel */}
            <h1
              className="font-extralight tracking-[0.35em] text-[#2d2d2d]"
              style={{
                fontSize: "clamp(42px, 7vw, 112px)",
                marginBottom: "clamp(36px, 6vh, 56px)",
                opacity: isVisible ? 1 : 0,
                transition: "opacity 1100ms ease 150ms",
              }}
            >
              Stay Alone
            </h1>

            {/* Hero copy - elegant and breathable */}
            <p
              className="max-w-md font-extralight leading-[1.7] tracking-[0.02em] text-[#6e6e73] md:leading-[1.65]"
              style={{
                fontSize: "clamp(19px, 2vw, 30px)",
                marginBottom: "clamp(44px, 7vh, 64px)",
                opacity: isVisible ? 1 : 0,
                transition: "opacity 1100ms ease 250ms",
              }}
            >
              <span className="block">{t.heroLine1}</span>
              <span className="block">{t.heroLine2}</span>
            </p>

            {/* CTA - Apple-like pill button */}
            <button
              onClick={() => setStep("time")}
              className="h-[44px] rounded-full border border-[#d2d2d7] bg-white/90 px-7 text-[15px] font-normal tracking-[0.02em] text-[#1d1d1f] backdrop-blur-sm transition-all duration-300 hover:border-[#a1a1a6] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] md:h-[46px] md:px-9"
              style={{
                opacity: isVisible ? 1 : 0,
                transition: "opacity 1100ms ease 450ms",
              }}
            >
              {t.ctaButton}
            </button>
          </div>
        )}

        {/* Time selection */}
        {step === "time" && (
          <div
            className="flex flex-col items-center text-center"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(20px)",
              transition: "all 600ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <h2 className="mb-14 max-w-md text-xl font-extralight leading-relaxed tracking-wide text-[#1a1a1a] md:mb-16 md:text-2xl">
              {t.timeQuestion}
            </h2>

            <div className="flex flex-col gap-4 md:flex-row md:gap-5">
              {TIME_OPTIONS.map((time) => (
                <button
                  key={time}
                  onClick={() => {
                    setSelectedTime(time)
                    setStep("trigger")
                  }}
                  className="min-w-[140px] rounded-full border border-[#e5e5e5] bg-transparent px-8 py-3 text-sm font-light tracking-wide text-[#1a1a1a] transition-all hover:border-[#c5c5c5] hover:bg-[#fafafa] md:px-10 md:py-4"
                >
                  {time === 15 && t.minutes15}
                  {time === 30 && t.minutes30}
                  {time === 60 && t.minutes60}
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep("landing")}
              className="mt-12 text-xs font-light tracking-wide text-[#a1a1a6] transition-colors hover:text-[#6e6e73]"
            >
              {t.back}
            </button>
          </div>
        )}

        {/* Trigger selection */}
        {step === "trigger" && (
          <div
            className="flex flex-col items-center text-center"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(20px)",
              transition: "all 600ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <h2 className="mb-12 max-w-md text-xl font-extralight leading-relaxed tracking-wide text-[#1a1a1a] md:mb-14 md:text-2xl">
              {t.triggerQuestion}
            </h2>

            <div className="flex max-w-lg flex-wrap justify-center gap-3 md:gap-4">
              {TRIGGER_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedTrigger(key)
                    startTimer()
                  }}
                  className="rounded-full border border-[#e5e5e5] bg-transparent px-5 py-2.5 text-sm font-light tracking-wide text-[#1a1a1a] transition-all hover:border-[#c5c5c5] hover:bg-[#fafafa] md:px-6 md:py-3"
                >
                  {t.triggers[key]}
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep("time")}
              className="mt-12 text-xs font-light tracking-wide text-[#a1a1a6] transition-colors hover:text-[#6e6e73]"
            >
              {t.back}
            </button>
          </div>
        )}

        {/* Timer */}
        {step === "timer" && (
          <div
            className="flex flex-col items-center text-center"
            style={{
              opacity: isVisible ? 1 : 0,
              transition: "all 600ms ease",
            }}
          >
            <p className="mb-10 text-lg font-light tracking-wide text-[#4a4a4a] md:mb-12 md:text-xl">
              {t.timerTitle}
            </p>

            <div
              className="mb-10 font-extralight tracking-wider text-[#1a1a1a] md:mb-12"
              style={{ fontSize: "clamp(4rem, 15vw, 8rem)" }}
            >
              {formatTime(timeRemaining)}
            </div>

            <div className="flex gap-4 md:gap-5">
              <button
                onClick={handlePulledAway}
                className="rounded-full border border-[#e5e5e5] bg-transparent px-5 py-2.5 text-xs font-light tracking-wide text-[#a1a1a6] transition-all hover:border-[#c5c5c5] hover:text-[#6e6e73]"
              >
                {t.pulledAway}
              </button>
              <button
                onClick={() => completeSession(true, false)}
                className="rounded-full border border-[#e5e5e5] bg-transparent px-6 py-2.5 text-xs font-light tracking-wide text-[#1a1a1a] transition-all hover:border-[#c5c5c5] hover:bg-[#fafafa]"
              >
                {t.finish}
              </button>
            </div>
          </div>
        )}

        {/* Completion */}
        {step === "complete" && (
          <div
            className="flex flex-col items-center text-center"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(20px)",
              transition: "all 800ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {/* Duration made yours */}
            <h2 className="mb-10 text-2xl font-extralight leading-relaxed tracking-wide text-[#1a1a1a] md:mb-12 md:text-3xl lg:text-4xl">
              {getCompletionMessage()}
            </h2>

            {/* Save prompt - only show if not logged in */}
            {!isLoggedIn && (
              <div className="mb-10 md:mb-12">
                <p className="mb-8 text-base font-extralight tracking-wide text-[#a1a1a6] md:text-lg">
                  {t.savePrompt}
                </p>
                <div className="flex flex-col gap-3 md:flex-row md:gap-4">
                  <button
                    onClick={() => setAuthMode("create")}
                    className="rounded-full border border-[#e5e5e5] bg-transparent px-6 py-3 text-sm font-light tracking-wide text-[#1a1a1a] transition-all hover:border-[#c5c5c5] hover:bg-[#fafafa]"
                  >
                    {t.createMySpace}
                  </button>
                  <button
                    onClick={resetToLanding}
                    className="rounded-full border border-[#e5e5e5] bg-transparent px-6 py-3 text-sm font-light tracking-wide text-[#a1a1a6] transition-all hover:border-[#c5c5c5] hover:text-[#6e6e73]"
                  >
                    {t.later}
                  </button>
                </div>
              </div>
            )}

            {/* Save message for logged in users */}
            {isLoggedIn && saveMessage && (
              <p className="mb-6 text-sm font-light tracking-wide text-[#34c759] md:mb-8">
                {saveMessage}
              </p>
            )}

            {/* If logged in, just show a continue button */}
            {isLoggedIn && (
              <div className="flex flex-col gap-3 md:flex-row md:gap-4">
                <button
                  onClick={() => setMyTimeOpen(true)}
                  className="rounded-full border border-[#e5e5e5] bg-transparent px-6 py-3 text-sm font-light tracking-wide text-[#1a1a1a] transition-all hover:border-[#c5c5c5] hover:bg-[#fafafa]"
                >
                  {t.mySpace}
                </button>
                <button
                  onClick={resetToLanding}
                  className="rounded-full border border-[#e5e5e5] bg-transparent px-6 py-3 text-sm font-light tracking-wide text-[#a1a1a6] transition-all hover:border-[#c5c5c5] hover:text-[#6e6e73]"
                >
                  {t.back}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* My Time Sheet */}
      <MyTimeSheet
        open={myTimeOpen}
        onOpenChange={setMyTimeOpen}
        stats={stats}
        mostCommonTrigger={stats ? getMostCommonTrigger(stats) : null}
        onSignOut={handleSignOut}
        isLoggedIn={isLoggedIn}
      />

      {/* Auth Modals */}
      <AuthModals
        mode={authMode}
        onClose={() => setAuthMode(null)}
        onSuccess={handleAuthSuccess}
        onModeChange={setAuthMode}
      />
    </div>
  )
}
