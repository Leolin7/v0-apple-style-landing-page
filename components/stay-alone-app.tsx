"use client"

import { useState, useEffect, useCallback, useRef, type KeyboardEvent } from "react"
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

type AppStep = "landing" | "chooseTime" | "timer" | "trigger" | "complete"

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
  // Frozen timing of a just-ended session, captured before we ask "what were
  // you escaping?" so the trigger screen's own duration isn't counted.
  const endedSessionRef = useRef<{
    startDate: Date
    endDate: Date
    elapsedSeconds: number
    elapsedMinutes: number
    status: SessionStatus
    completed: boolean
    isPulledAway: boolean
  } | null>(null)

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
            endSession(true, false)
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

  // Step 1 of entering: cross the threshold. Request fullscreen so the world
  // falls away, then reveal the time choices inside the space.
  const enterSpace = () => {
    try {
      const el = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>
      }
      if (el.requestFullscreen) {
        void el.requestFullscreen().catch(() => {})
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen()
      }
    } catch {
      /* no-op — iOS Safari falls back to the in-page immersive layer */
    }
    setStep("chooseTime")
  }

  const startTimer = (minutes: number) => {
    setSelectedTime(minutes)
    setTimeRemaining(minutes * 60)
    setPulledAwayCount(0)
    startTimestampRef.current = Date.now()
    startDateRef.current = new Date()
    setSaveMessage(null)
    setStep("timer")
  }

  const exitFullscreenSafely = () => {
    try {
      const doc = document as Document & {
        webkitExitFullscreen?: () => Promise<void>
        webkitFullscreenElement?: Element | null
      }
      if (document.fullscreenElement && document.exitFullscreen) {
        void document.exitFullscreen().catch(() => {})
      } else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen()
      }
    } catch {
      /* no-op */
    }
  }

  // Timer ended (countdown hit 0, Finish, or pulled away). Freeze the timing,
  // then ask "what were you escaping?" — the trigger is chosen AFTER, when it's
  // natural to look back, not demanded before you've even begun.
  const endSession = (completed: boolean, isPulledAway: boolean = false) => {
    if (timerRef.current) clearInterval(timerRef.current)
    const endTimestamp = Date.now()
    const endDate = new Date()
    const startTimestamp = startTimestampRef.current || endTimestamp
    const startDate = startDateRef.current || endDate
    const elapsedSeconds = Math.floor((endTimestamp - startTimestamp) / 1000)
    const elapsedMinutes = Math.floor(elapsedSeconds / 60)

    let status: SessionStatus
    if (isPulledAway) status = "pulled_away"
    else if (timeRemaining > 0) status = "finished_early"
    else status = "completed"

    endedSessionRef.current = {
      startDate,
      endDate,
      elapsedSeconds,
      elapsedMinutes,
      status,
      completed,
      isPulledAway,
    }
    setCompletedElapsedSeconds(elapsedSeconds)
    setStep("trigger")
  }

  // Record the session with the trigger the user just chose, then show completion.
  const recordSession = async (trigger: TriggerType) => {
    const ended = endedSessionRef.current
    if (!ended) {
      setStep("complete")
      return
    }
    setSelectedTrigger(trigger)
    const selectedDurationSeconds = selectedTime * 60

    const { isSignedIn: supabaseSignedIn } = await checkSupabaseAuth()

    if (supabaseSignedIn) {
      const result = await saveSessionToSupabase(
        ended.startDate,
        ended.endDate,
        ended.elapsedSeconds,
        selectedDurationSeconds,
        trigger,
        ended.status
      )
      if (result.success) {
        setSaveMessage(t.savedToMySpace)
        const { sessions } = await loadSessionsFromSupabase()
        if (sessions.length > 0) {
          setStats(buildStatsFromSessions(sessions))
        }
      } else {
        setSaveMessage(t.couldNotSave)
        const newStats = addSession(
          ended.elapsedMinutes > 0 ? ended.elapsedMinutes : 1,
          trigger,
          ended.completed && !ended.isPulledAway,
          pulledAwayCount,
          ended.elapsedSeconds,
          true
        )
        setStats(newStats)
      }
    } else {
      const newStats = addSession(
        ended.elapsedMinutes > 0 ? ended.elapsedMinutes : 1,
        trigger,
        ended.completed && !ended.isPulledAway,
        pulledAwayCount,
        ended.elapsedSeconds,
        false
      )
      setStats(newStats)
    }

    setStep("complete")
    if (supabaseSignedIn) {
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

  const handlePulledAway = () => {
    // End the session with pulled_away status, then ask the trigger question
    endSession(false, true)
  }

  const resetToLanding = () => {
    exitFullscreenSafely()
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

  // ── Daylight: time expressed as a slow shift from afternoon to dusk ──
  // progress 0 → 1 across the whole session. The space drifts from a soft,
  // warm afternoon into a deep amber dusk, so you *feel* time pass without
  // staring at a number.
  const totalSeconds = selectedTime * 60
  const daylightProgress =
    totalSeconds > 0 ? Math.min(1, Math.max(0, 1 - timeRemaining / totalSeconds)) : 0

  // interpolate between two hex colors
  const lerpColor = (a: string, b: string, t: number) => {
    const ah = a.replace("#", "")
    const bh = b.replace("#", "")
    const ar = parseInt(ah.slice(0, 2), 16)
    const ag = parseInt(ah.slice(2, 4), 16)
    const ab = parseInt(ah.slice(4, 6), 16)
    const br = parseInt(bh.slice(0, 2), 16)
    const bg = parseInt(bh.slice(2, 4), 16)
    const bb = parseInt(bh.slice(4, 6), 16)
    const r = Math.round(ar + (br - ar) * t)
    const g = Math.round(ag + (bg - ag) * t)
    const bl = Math.round(ab + (bb - ab) * t)
    return `rgb(${r}, ${g}, ${bl})`
  }

  // afternoon → dusk palette (top & bottom of a soft vertical gradient)
  const skyTop = lerpColor("#F4EFE8", "#EAD4BC", daylightProgress) // soft cream → soft warm sand
  const skyBottom = lerpColor("#F7F1E9", "#DCB78F", daylightProgress) // light → gentle dusk amber

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-[#F7F5F2] text-[#1A1A1A]">
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
      <main className="flex min-h-0 flex-1 flex-col items-center px-6">
        {/* Landing - a quiet room */}
        {step === "landing" && (
          <div
            className="my-auto flex w-full max-w-[460px] flex-col items-center text-center"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(12px)",
              transition: "all 1200ms cubic-bezier(0.22, 1, 0.36, 1)",
              paddingTop: "clamp(52px, 8vh, 84px)",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + clamp(40px, 6vh, 72px))",
            }}
          >
            {/* Standalone counter number */}
            <div
              className="quiet-breathe"
              style={{
                marginBottom: "clamp(56px, 10vh, 120px)",
                opacity: isVisible ? 1 : 0,
                transition: "opacity 1600ms ease 400ms",
              }}
            >
              <span
                className="counter-row"
                style={{ gap: "8px", height: "24px" }}
              >
                <span
                  className="breathing-dot"
                  aria-hidden="true"
                  style={{ width: "6px", height: "6px", minWidth: "6px", minHeight: "6px" }}
                />
                <span
                  className="counter-text text-[#A8A8A8]"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    height: "24px",
                    fontFamily: '"IBM Plex Mono", "JetBrains Mono", "Courier New", ui-monospace, monospace',
                    fontSize: "16px",
                    fontWeight: 300,
                    lineHeight: "1",
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

            {/* Core group - hero, sub-line, question, choices stay together */}
            <div className="flex flex-col items-center">
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
              className={`mx-auto flex flex-col items-center justify-center font-light italic leading-[1.6] text-[#A8A8A8] ${language === "zh" ? "editorial-zh not-italic" : "editorial"}`}
              style={{
                fontSize: "clamp(13px, 1.7vw, 15px)",
                height: "clamp(44px, 7vh, 52px)",
                marginBottom: "clamp(44px, 6.5vh, 76px)",
                maxWidth: "340px",
                opacity: isVisible ? 1 : 0,
                transition: "opacity 1100ms ease 350ms",
              }}
            >
              {t.heroSubline1 ? <p>{t.heroSubline1}</p> : null}
              {t.heroSubline2 ? <p>{t.heroSubline2}</p> : null}
            </div>

            {/* The entry — the action word is the threshold. Clicking it makes
                the world fall away (fullscreen) and reveals the time choices. */}
            <p
              className={`font-light text-[#8A8A8A] ${language === "zh" ? "editorial-zh" : "editorial"}`}
              style={{
                fontSize: "clamp(14px, 1.9vw, 16px)",
                marginBottom: "clamp(24px, 3.5vh, 36px)",
                opacity: isVisible ? 1 : 0,
                transition: "opacity 1100ms ease 400ms",
              }}
            >
              <style>{`
                @keyframes saWordBreath { 0%,100%{ opacity:.78; } 50%{ opacity:1; } }
                .sa-enter-word{
                  color:#1A1A1A;
                  cursor:pointer;
                  border-bottom:1px solid rgba(232,168,124,0.55);
                  padding-bottom:1px;
                  animation:saWordBreath 3.6s ease-in-out infinite;
                  transition:border-color 300ms ease;
                }
                .sa-enter-word:hover{ border-color:rgba(232,168,124,0.9); }
                @media (prefers-reduced-motion: reduce){ .sa-enter-word{ animation:none; } }
              `}</style>
              {t.enterPrefix}
              <span
                role="button"
                tabIndex={0}
                className="sa-enter-word"
                onClick={enterSpace}
                onKeyDown={(e: KeyboardEvent) => {
                  if (e.key === "Enter" || e.key === " ") enterSpace()
                }}
              >
                {t.enterAction}
              </span>
              {t.enterSuffix}
            </p>

            </div>
            {/* end core group */}

            {/* Stay Alone - a quiet signature */}
            <p
              className="wordmark text-[#B8B3AD]"
              style={{
                marginTop: "clamp(56px, 10vh, 120px)",
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
        {/* Choose how long — revealed inside the space, after crossing the threshold */}
        {step === "chooseTime" && (
          <div
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden px-6"
            style={{
              background: "linear-gradient(to bottom, #F4EFE8, #F7F1E9)",
              animation: "saSpaceIn 900ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <style>{`@keyframes saSpaceIn { 0%{ opacity:0; } 100%{ opacity:1; } }`}</style>
            <p
              className={`mb-12 font-light text-[#8A8A8A] md:mb-14 ${language === "zh" ? "editorial-zh" : "editorial"}`}
              style={{ fontSize: "clamp(15px, 2vw, 18px)" }}
            >
              {t.chooseTimeTitle}
            </p>
            <div className="flex flex-col items-center gap-7 md:gap-8">
              {([
                { time: 15, label: t.choiceMoment, duration: t.durationShort },
                { time: 30, label: t.choiceWhile, duration: t.durationMid },
                { time: 60, label: t.choiceLonger, duration: t.durationLong },
              ] as const).map(({ time, label, duration }) => (
                <button
                  key={time}
                  onClick={() => {
                    startTimer(time)
                  }}
                  className="group flex flex-col items-center bg-transparent transition-opacity duration-300"
                >
                  <span
                    className={`text-[#1A1A1A] opacity-80 transition-opacity duration-300 group-hover:opacity-100 ${language === "zh" ? "editorial-zh" : "editorial"}`}
                    style={{ fontSize: "clamp(20px, 2.8vw, 24px)" }}
                  >
                    {label}
                  </span>
                  <span className={`mt-1.5 text-[12px] font-light text-[#A8A8A8] ${language === "zh" ? "editorial-zh" : ""}`}>
                    {duration}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={resetToLanding}
              className="absolute text-[13px] font-light text-[#A8A8A8] transition-colors hover:text-[#7A7A7A]"
              style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 40px)" }}
            >
              {t.backOutside}
            </button>
          </div>
        )}

        {/* Trigger reflection — asked AFTER, looking back on what you stepped away from */}
        {step === "trigger" && (
          <div
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden px-6"
            style={{
              background: "linear-gradient(to bottom, #EAD4BC, #DCB78F)",
              animation: "saSpaceIn 900ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <h2 className={`mb-12 max-w-md font-light leading-relaxed md:mb-14 ${language === "zh" ? "editorial-zh" : "editorial"}`}
              style={{ fontSize: "clamp(20px, 3vw, 26px)", color: "rgba(50,38,28,0.85)" }}
            >
              {t.triggerQuestionAfter}
            </h2>

            <div className="flex max-w-lg flex-wrap justify-center gap-3 md:gap-4">
              {TRIGGER_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => recordSession(key)}
                  className="rounded-full border bg-transparent px-5 py-2.5 text-sm font-light transition-all md:px-6 md:py-3"
                  style={{ borderColor: "rgba(80,55,38,0.28)", color: "rgba(50,38,28,0.9)" }}
                >
                  {t.triggers[key]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Timer */}
        {step === "timer" && (
          <div
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden"
            style={{
              background: `linear-gradient(to bottom, ${skyTop}, ${skyBottom})`,
              transition: "background 1500ms linear",
              opacity: isVisible ? 1 : 0,
              animation: "saSpaceIn 1400ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <style>{`
              @keyframes saSpaceIn { 0%{ opacity:0; } 100%{ opacity:1; } }
              @keyframes saGlowBreath {
                0%,100%{ transform:translate(-50%,-50%) scale(1); opacity:.62; }
                50%{ transform:translate(-50%,-50%) scale(1.14); opacity:.95; }
              }
              @media (prefers-reduced-motion: reduce){
                .sa-breath-glow{ animation:none !important; }
              }
            `}</style>

            {/* Companion breathing light — a warm sun/lamp that grows more
                present as the light deepens toward dusk. Sits above the
                gradient with a real, visible warm core. */}
            <div
              className="sa-breath-glow"
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "50%",
                top: "44%",
                transform: "translate(-50%,-50%)",
                width: "min(64vw, 360px)",
                height: "min(64vw, 360px)",
                borderRadius: "50%",
                backgroundImage: `radial-gradient(circle, rgba(255,${236 - daylightProgress * 40},${
                  205 - daylightProgress * 55
                },${0.55 + daylightProgress * 0.3}) 0%, rgba(255,225,180,${
                  0.22 + daylightProgress * 0.18
                }) 38%, rgba(255,210,160,0) 70%)`,
                animation: "saGlowBreath 6.5s ease-in-out infinite",
                filter: "blur(1px)",
                transition: "background-image 1500ms linear",
              }}
            />

            {/* Faint title, sits just below the glow's core so it stays
                readable instead of lost in the brightest light. Fades away as
                you settle in (first ~12% of the time). */}
            <p
              className={`relative z-10 font-light ${language === "zh" ? "editorial-zh" : "editorial"}`}
              style={{
                marginTop: "clamp(120px, 22vh, 200px)",
                fontSize: "clamp(15px, 2vw, 19px)",
                letterSpacing: "0.01em",
                color: "rgba(54,42,32,0.7)",
                opacity: Math.max(0, 1 - daylightProgress * 8),
                transition: "opacity 2000ms ease",
              }}
            >
              {t.timerTitle}
            </p>

            {/* Very faint time, tucked low — there if you need it, never demanding */}
            <div
              className="wordmark absolute z-10"
              style={{
                bottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)",
                fontSize: "13px",
                letterSpacing: "0.3em",
                color: "rgba(60,48,38,0.34)",
              }}
            >
              {formatTime(timeRemaining)}
            </div>

            {/* Gentle controls, low and quiet */}
            <div
              className="absolute z-10 flex items-center gap-6"
              style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 40px)" }}
            >
              <button
                onClick={handlePulledAway}
                className="font-light transition-colors"
                style={{ fontSize: "13px", color: "rgba(60,48,38,0.4)" }}
              >
                {t.pulledAway}
              </button>
              <button
                onClick={() => endSession(true, false)}
                className="font-light transition-colors"
                style={{ fontSize: "13px", color: "rgba(60,48,38,0.62)" }}
              >
                {t.finish}
              </button>
            </div>
          </div>
        )}

        {/* Completion */}
        {step === "complete" && (
          <div
            className="my-auto flex flex-col items-center text-center"
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

            {/* Save confirmation for logged-in users */}
            {isLoggedIn && saveMessage && (
              <p className="mb-8 text-sm font-light text-[#E8A87C]">
                {saveMessage}
              </p>
            )}

            {/* Gentle invitation — everyone can look, even without an account
                (My Space reads local data; the "keep this" nudge lives inside it) */}
            <button
              onClick={() => setMyTimeOpen(true)}
              className="font-light text-[#1A1A1A] underline decoration-[#D9CFC4] decoration-1 underline-offset-[6px] transition-colors hover:decoration-[#C5B8A8]"
              style={{ fontSize: "clamp(15px, 2vw, 17px)" }}
            >
              {t.seeYourSpace}
            </button>

            <button
              onClick={resetToLanding}
              className="mt-7 font-light text-[#A8A8A8] transition-colors hover:text-[#7A7A7A]"
              style={{ fontSize: "clamp(13px, 1.6vw, 14px)" }}
            >
              {t.backOutside}
            </button>
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
        onCreateSpace={() => {
          setMyTimeOpen(false)
          setAuthMode("create")
        }}
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
