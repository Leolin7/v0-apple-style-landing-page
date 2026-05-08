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

type AppStep = "landing" | "trigger" | "timer" | "complete"

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
  const [showExplain, setShowExplain] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimestampRef = useRef<number | null>(null)
  const startDateRef = useRef<Date | null>(null)
  const hasCalledApi = useRef(false)

  // Close explain modal on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showExplain) {
        setShowExplain(false)
      }
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [showExplain])

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
    <div className="relative flex min-h-screen flex-col bg-[#F7F5F2] text-[#1A1A1A]">
      {/* Subtle world presence at bottom - only on landing */}
      {step === "landing" && <WorldPresence />}
      
      {/* Top-left: Language switch */}
      {step === "landing" && (
        <button
          onClick={() => setLanguage(language === "en" ? "zh" : "en")}
          className="top-nav-link pointer-events-auto absolute z-50 text-[13px] font-light transition-colors duration-200 hover:opacity-80"
          style={{ color: "#1A1A1A", opacity: 0.58 }}
        >
          {language === "en" ? "中文" : "English"}
        </button>
      )}

      {/* Top-right: My Space */}
      {step === "landing" && (
        <button
          onClick={handleHeaderClick}
          className="top-nav-link-right pointer-events-auto absolute z-50 text-[13px] font-light transition-colors duration-200 hover:opacity-80"
          style={{ color: "#1A1A1A", opacity: 0.58 }}
        >
          {language === "zh" ? "我的空间" : "My Space"}
        </button>
      )}

      {/* Bottom-left: Explain link */}
      {step === "landing" && (
        <button
          type="button"
          className="sa-explain-link pointer-events-auto text-[13px] font-light"
          onClick={() => setShowExplain(true)}
        >
          {language === "zh" ? "这里会发生什么 →" : "What happens here →"}
        </button>
      )}

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6">
        {/* Landing - with time selection directly on first screen */}
        {step === "landing" && (
          <div
            className="sa-hero-stack"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(-2vh)" : "translateY(12px)",
              transition: "all 1200ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {/* Counter line with breathing dot */}
            <div
              className="sa-counter-row"
              style={{
                opacity: isVisible ? 0.9 : 0,
                transition: "opacity 1400ms ease 300ms",
              }}
            >
              <span className="breathing-dot" aria-hidden="true" />
              <span className={`counter-text text-[13px] font-light md:text-[14px] ${language === "zh" ? "editorial-zh" : "editorial"}`} style={{ color: "#1A1A1A", opacity: 0.58 }}>
                {language === "zh" ? (
                  <>这是第 {visitorCount !== null ? visitorCount.toLocaleString() : "..."} 次，有人选择了</>
                ) : (
                  <>For the {visitorCount !== null ? getOrdinal(visitorCount, language) : "..."}time, someone chose</>
                )}
              </span>
            </div>

            {/* Stay Alone wordmark - mono font */}
            <h1
              className="sa-wordmark text-[#1A1A1A]"
              style={{
                opacity: isVisible ? 1 : 0,
                transition: "opacity 1100ms ease 150ms",
              }}
            >
              Stay Alone
            </h1>

            {/* Hero copy - soft editorial serif */}
            <div
              className={`sa-hero-copy ${language === "zh" ? "editorial-zh" : "editorial"}`}
              style={{
                opacity: isVisible ? 0.88 : 0,
                transition: "opacity 1100ms ease 250ms",
              }}
            >
              <div>{t.heroLine1}</div>
              <div>{t.heroLine2}</div>
            </div>

{/* Action area - time selection and post-buttons row */}
            <div
              className="sa-action-area"
              style={{
                opacity: isVisible ? 1 : 0,
                transition: "opacity 1100ms ease 350ms",
              }}
            >
              <div className={`sa-action-label text-[14px] font-light ${language === "zh" ? "editorial-zh" : ""}`}>
                {language === "zh" ? "选一段时间" : "Make it yours"}
              </div>

              <div className="sa-time-button-row">
                <button
                  className="sa-time-button"
                  onClick={() => {
                    setSelectedTime(15)
                    setStep("trigger")
                  }}
                >
                  {language === "zh" ? "15 分钟" : "15 minutes"}
                </button>

                <button
                  className="sa-time-button"
                  onClick={() => {
                    setSelectedTime(30)
                    setStep("trigger")
                  }}
                >
                  {language === "zh" ? "30 分钟" : "30 minutes"}
                </button>

                <button
                  className="sa-time-button"
                  onClick={() => {
                    setSelectedTime(60)
                    setStep("trigger")
                  }}
                >
                  {language === "zh" ? "60 分钟" : "60 minutes"}
                </button>
              </div>

              {language === "zh" && (
                <div className="sa-belong-line editorial-zh text-[14px] font-light">
                  留给自己
                </div>
              )}
            </div>
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
            <h2 className={`mb-12 max-w-md font-light leading-relaxed text-[#1A1A1A] md:mb-14 ${language === "zh" ? "editorial-zh" : "editorial"}`}
              style={{ fontSize: "clamp(20px, 3vw, 26px)" }}
            >
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
                  className="rounded-full border border-[#DDD8D2] bg-transparent px-5 py-2.5 text-sm font-light text-[#1A1A1A] transition-all hover:border-[#C5C0BA] md:px-6 md:py-3"
                >
                  {t.triggers[key]}
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep("landing")}
              className="mt-12 text-[13px] font-light text-[#8A8A8A] transition-colors hover:text-[#5A5A5A]"
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
            <p className={`mb-10 font-light text-[#8A8A8A] md:mb-12 ${language === "zh" ? "editorial-zh" : "editorial"}`}
              style={{ fontSize: "clamp(16px, 2vw, 20px)" }}
            >
              {t.timerTitle}
            </p>

            <div
              className="wordmark mb-10 text-[#1A1A1A] md:mb-12"
              style={{ fontSize: "clamp(4rem, 15vw, 8rem)" }}
            >
              {formatTime(timeRemaining)}
            </div>

            <div className="flex gap-4 md:gap-5">
              <button
                onClick={handlePulledAway}
                className="rounded-full border border-[#DDD8D2] bg-transparent px-5 py-2.5 text-[13px] font-light text-[#8A8A8A] transition-all hover:border-[#C5C0BA] hover:text-[#5A5A5A]"
              >
                {t.pulledAway}
              </button>
              <button
                onClick={() => completeSession(true, false)}
                className="rounded-full border border-[#DDD8D2] bg-transparent px-6 py-2.5 text-[13px] font-light text-[#1A1A1A] transition-all hover:border-[#C5C0BA]"
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
            <h2 className={`mb-10 font-light leading-relaxed text-[#1A1A1A] md:mb-12 ${language === "zh" ? "editorial-zh" : "editorial"}`}
              style={{ fontSize: "clamp(22px, 4vw, 32px)" }}
            >
              {getCompletionMessage()}
            </h2>

            {/* Save prompt - only show if not logged in */}
            {!isLoggedIn && (
              <div className="mb-10 md:mb-12">
                <p className="mb-8 font-light text-[#8A8A8A]"
                  style={{ fontSize: "clamp(14px, 2vw, 16px)" }}
                >
                  {t.savePrompt}
                </p>
                <div className="flex flex-col gap-3 md:flex-row md:gap-4">
                  <button
                    onClick={() => setAuthMode("create")}
                    className="rounded-full border border-[#DDD8D2] bg-transparent px-6 py-3 text-sm font-light text-[#1A1A1A] transition-all hover:border-[#C5C0BA]"
                  >
                    {t.createMySpace}
                  </button>
                  <button
                    onClick={resetToLanding}
                    className="rounded-full border border-[#DDD8D2] bg-transparent px-6 py-3 text-sm font-light text-[#8A8A8A] transition-all hover:border-[#C5C0BA] hover:text-[#5A5A5A]"
                  >
                    {t.later}
                  </button>
                </div>
              </div>
            )}

            {/* Save message for logged in users */}
            {isLoggedIn && saveMessage && (
              <p className="mb-6 text-sm font-light text-[#E8A87C] md:mb-8">
                {saveMessage}
              </p>
            )}

            {/* If logged in, just show a continue button */}
            {isLoggedIn && (
              <div className="flex flex-col gap-3 md:flex-row md:gap-4">
                <button
                  onClick={() => setMyTimeOpen(true)}
                  className="rounded-full border border-[#DDD8D2] bg-transparent px-6 py-3 text-sm font-light text-[#1A1A1A] transition-all hover:border-[#C5C0BA]"
                >
                  {t.mySpace}
                </button>
                <button
                  onClick={resetToLanding}
                  className="rounded-full border border-[#DDD8D2] bg-transparent px-6 py-3 text-sm font-light text-[#8A8A8A] transition-all hover:border-[#C5C0BA] hover:text-[#5A5A5A]"
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

      {/* Explain modal */}
      {showExplain && (
        <div 
          className="explain-overlay" 
          onClick={() => setShowExplain(false)}
          onKeyDown={(e) => e.key === "Escape" && setShowExplain(false)}
        >
          <div 
            className="explain-modal" 
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="explain-title"
          >
            <button 
              type="button"
              className="explain-close" 
              onClick={() => setShowExplain(false)}
              aria-label={language === "zh" ? "关闭" : "Close"}
            >
              ×
            </button>
            <h2 id="explain-title" className={language === "zh" ? "editorial-zh" : "editorial"}>
              {language === "zh" ? "这里会发生什么" : "What happens here"}
            </h2>
            <p className={language === "zh" ? "editorial-zh" : ""}>
              {language === "zh"
                ? "选 15、30 或 60 分钟。\n页面会安静下来。\n结束后，把这段时间留在我的空间。"
                : "Choose 15, 30, or 60 minutes.\nThe page goes quiet.\nWhen you finish, save the time to My Space."}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
