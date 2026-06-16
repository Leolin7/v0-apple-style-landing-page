"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useLanguage } from "@/lib/language-context"
import { formatElapsedDuration } from "@/lib/translations"
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

type AppStep = "landing" | "trigger" | "timer" | "complete"

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
      setVisitorCount(null) // On failure, show no number (dot stays)
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
      {/* Top-left: Language switch */}
      {step === "landing" && (
        <button
          onClick={() => setLanguage(language === "en" ? "zh" : "en")}
          className={`top-nav-link pointer-events-auto absolute z-50 text-[14px] font-light text-[#8A8A8A] transition-colors duration-200 hover:text-[#5A5A5A] ${language === "zh" ? "editorial-zh" : ""}`}
        >
          {language === "en" ? "中文" : "English"}
        </button>
      )}

      {/* Top-right: My Space */}
      {step === "landing" && (
        <button
          onClick={handleHeaderClick}
          className={`top-nav-link-right pointer-events-auto absolute z-50 text-[14px] font-light text-[#8A8A8A] transition-colors duration-200 hover:text-[#5A5A5A] ${language === "zh" ? "editorial-zh" : ""}`}
        >
          {language === "zh" ? "我的空间" : "My Space"}
        </button>
      )}

      

      {/* Main content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6">
        {/* Landing - a quiet room */}
        {step === "landing" && (
          <div
            className="flex w-full max-w-[460px] flex-col items-center text-center"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(12px)",
              transition: "all 1200ms cubic-bezier(0.22, 1, 0.36, 1)",
              paddingTop: "clamp(32px, 5vh, 56px)",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + clamp(32px, 5vh, 56px))",
            }}
          >
            {/* Standalone counter number */}
            <div
              className="quiet-breathe"
              style={{
                marginBottom: "clamp(48px, 7vh, 80px)",
                opacity: isVisible ? 1 : 0,
                transition: "opacity 1600ms ease 400ms",
              }}
            >
              <span
                className="counter-row"
                style={{ gap: "8px", height: "22px", lineHeight: "22px" }}
              >
                <span
                  className="breathing-dot"
                  aria-hidden="true"
                  style={{ width: "6px", height: "6px", minWidth: "6px", minHeight: "6px" }}
                />
                <span
                  className="counter-text text-[#A8A8A8]"
                  style={{
                    fontFamily: '"IBM Plex Mono", "JetBrains Mono", ui-monospace, monospace',
                    fontSize: "16px",
                    fontWeight: 300,
                    lineHeight: "22px",
                    letterSpacing: "0.14em",
                    opacity: visitorCount !== null ? 1 : 0,
                    transition: "opacity 800ms ease",
                  }}
                >
                  {visitorCount !== null ? visitorCount.toLocaleString() : "\u00A0"}
                </span>
              </span>

              {/* Companionship label - gives the number meaning */}
              <p
                className={`font-light text-[#A8A8A8] ${language === "zh" ? "editorial-zh" : "editorial"}`}
                style={{
                  marginTop: "10px",
                  fontSize: "14px",
                  lineHeight: "20px",
                  height: "20px",
                  letterSpacing: language === "zh" ? "0.04em" : "0.02em",
                  opacity: visitorCount !== null ? 1 : 0,
                  transition: "opacity 1000ms ease 200ms",
                }}
              >
                {visitorCount !== null ? t.counterLabel : "\u00A0"}
              </p>
            </div>

            {/* Hero copy - the emotional centre */}
            <div
              className={`leading-[1.5] text-[#1A1A1A] ${language === "zh" ? "editorial-zh" : "editorial"}`}
              style={{
                fontSize: "clamp(30px, 4.6vw, 44px)",
                fontWeight: 500,
                marginBottom: "clamp(22px, 3.5vh, 34px)",
                opacity: isVisible ? 1 : 0,
                transition: "opacity 1100ms ease 250ms",
              }}
            >
              <p>{t.heroLine1}</p>
              <p>{t.heroLine2}</p>
            </div>

            {/* Hero sub-line - quietly names what this is, without breaking the calm */}
            <div
              className={`mx-auto font-light italic leading-[1.6] text-[#A8A8A8] ${language === "zh" ? "editorial-zh not-italic" : "editorial"}`}
              style={{
                fontSize: "clamp(13px, 1.7vw, 15px)",
                marginBottom: "clamp(44px, 6.5vh, 76px)",
                maxWidth: "340px",
                opacity: isVisible ? 1 : 0,
                transition: "opacity 1100ms ease 350ms",
              }}
            >
              {t.heroSubline1 ? <p>{t.heroSubline1}</p> : null}
              {t.heroSubline2 ? <p>{t.heroSubline2}</p> : null}
            </div>

            {/* Transition question - bridges the sub-line into the choices */}
            <p
              className={`font-light text-[#8A8A8A] ${language === "zh" ? "editorial-zh" : "editorial"}`}
              style={{
                fontSize: "clamp(13px, 1.7vw, 15px)",
                marginBottom: "clamp(24px, 3.5vh, 36px)",
                opacity: isVisible ? 1 : 0,
                transition: "opacity 1100ms ease 400ms",
              }}
            >
              {t.timeQuestion}
            </p>

            {/* Quiet time choices */}
            <div
              className="flex flex-col items-center gap-6 md:gap-7"
              style={{
                opacity: isVisible ? 1 : 0,
                transition: "opacity 1100ms ease 450ms",
              }}
            >
              {([
                { time: 15, label: t.choiceMoment, duration: t.durationShort },
                { time: 30, label: t.choiceWhile, duration: t.durationMid },
                { time: 60, label: t.choiceLonger, duration: t.durationLong },
              ] as const).map(({ time, label, duration }) => (
                <button
                  key={time}
                  onClick={() => {
                    setSelectedTime(time)
                    setStep("trigger")
                  }}
                  className="group flex flex-col items-center bg-transparent transition-opacity duration-300"
                >
                  <span
                    className={`text-[#1A1A1A] opacity-80 transition-opacity duration-300 group-hover:opacity-100 ${language === "zh" ? "editorial-zh" : "editorial"}`}
                    style={{ fontSize: "clamp(18px, 2.6vw, 22px)" }}
                  >
                    {label}
                  </span>
                  <span className={`mt-1.5 text-[12px] font-light text-[#A8A8A8] ${language === "zh" ? "editorial-zh" : ""}`}>
                    {duration}
                  </span>
                </button>
              ))}
            </div>

            {/* Stay Alone - a quiet signature */}
            <p
              className="wordmark text-[#B8B3AD]"
              style={{
                marginTop: "clamp(52px, 8vh, 88px)",
                fontSize: "16px",
                letterSpacing: "0.38em",
                opacity: isVisible ? 1 : 0,
                transition: "opacity 1400ms ease 900ms",
              }}
            >
              Stay Alone
            </p>
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
    </div>
  )
}
