"use client"

import { useEffect, useMemo, useState } from "react"
import { useLanguage } from "@/lib/language-context"
import { formatDuration } from "@/lib/translations"
import type { UserStats, TriggerType, Session } from "@/lib/storage"
import { isLocalCapReached } from "@/lib/storage"
import { Sheet, SheetContent } from "@/components/ui/sheet"

interface MyTimeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stats: UserStats | null
  mostCommonTrigger: TriggerType | null
  onSignOut: () => void
  isLoggedIn: boolean
  onCreateSpace?: () => void
}

// ── greeting by time of day ──────────────────────────────────
function getGreeting(lang: string): string {
  const h = new Date().getHours()
  if (lang === "zh") {
    if (h < 5) return "夜深了"
    if (h < 11) return "早安"
    if (h < 18) return "午后好"
    return "晚上好"
  }
  if (h < 5) return "Late night"
  if (h < 11) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

// ── relative time for the "recently" stream ──────────────────
function relativeTime(dateStr: string, lang: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (lang === "zh") {
    if (days <= 0) return "今天"
    if (days === 1) return "昨天"
    if (days < 7) return `${days} 天前`
    if (days < 14) return "上周"
    return `${Math.floor(days / 7)} 周前`
  }
  if (days <= 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 7) return `${days} days ago`
  if (days < 14) return "last week"
  return `${Math.floor(days / 7)} weeks ago`
}

// ── echo: the "we understand you" line · STRICT thresholds ───
function buildEcho(
  completed: Session[],
  mostCommonTrigger: TriggerType | null,
  triggerLabel: (t: TriggerType) => string,
  lang: string
): string {
  const n = completed.length

  // < 3 sessions: never fabricate a pattern (宁缺毋滥)
  if (n < 3) {
    return lang === "zh" ? "这是一个开始" : "This is a beginning"
  }

  // night pattern: only if > 50%
  const nightCount = completed.filter((s) => {
    const h = new Date(s.date).getHours()
    return h >= 21 || h < 5
  }).length
  if (nightCount / n > 0.5) {
    return lang === "zh" ? "你总在夜里，来到这里" : "You come here most often at night"
  }

  // trigger pattern: only if the top trigger is > 50% (strict)
  if (mostCommonTrigger) {
    const topCount = completed.filter((s) => s.trigger === mostCommonTrigger).length
    if (topCount / n > 0.5) {
      const label = triggerLabel(mostCommonTrigger)
      return lang === "zh"
        ? `这段时间，你最常想逃开的，是${label}`
        : `Lately, what you most wanted to escape was ${label}`
    }
  }

  // enough data but no strong pattern: a gentle, true line (not a fabricated "insight")
  return lang === "zh" ? "你一直在为自己，守着这段时间" : "You keep making this time for yourself"
}

// ── star field · warm candlelight ────────────────────────────
type StarPoint = { x: number; y: number; size: number; depth: number; big: boolean; delay: number }

function Stars({ sessions }: { sessions: Session[] }) {
  const recent = sessions.slice(0, 30)
  const pts = useMemo<StarPoint[]>(() => {
    return recent.map((s: Session, i: number): StarPoint => {
      const seed = (parseInt(s.id, 10) || s.id.length * (i + 7)) + 1
      const rx = (((Math.sin(seed * 12.9898) * 43758.5453) % 1) + 1) % 1
      const ry = (((Math.sin(seed * 4.1414 + 1.7) * 24634.633) % 1) + 1) % 1
      const jx = (((Math.sin(seed * 91.21) * 9123.7) % 1) + 1) % 1
      // size grows smoothly with actual duration, but the range is deliberately
      // gentle (≈5px → ≈11px). sqrt compresses it so a 60-min point is a bit
      // larger than a 1-min point — never dozens of times bigger.
      const MIN_SIZE = 5
      const MAX_SIZE = 11
      const capped = Math.min(s.duration, 60)
      const t = Math.sqrt(capped / 60) // 0..1, compressed
      const size = MIN_SIZE + t * (MAX_SIZE - MIN_SIZE)
      const daysAgo = (Date.now() - new Date(s.date).getTime()) / 86400000
      const depth = Math.max(0.32, 1 - daysAgo / 50)
      // vertical spread shrinks when there are few points (so they stay compact)
      const spread = Math.min(70, 18 + recent.length * 7)
      const yTop = 50 - spread / 2
      return {
        x: 10 + rx * 80,
        y: yTop + ry * spread + (jx - 0.5) * 5,
        size,
        depth,
        big: s.duration >= 45,
        delay: i * 55,
      }
    })
  }, [recent])

  // container height adapts: tight for few points, full for many
  const fieldHeight = Math.min(168, 70 + recent.length * 14)

  const [lit, setLit] = useState(false)
  useEffect(() => {
    setLit(false)
    const t = setTimeout(() => setLit(true), 80)
    return () => clearTimeout(t)
  }, [sessions])

  return (
    <div style={{ position: "relative", width: "100%", height: fieldHeight, marginTop: 8 }}>
      <style>{`
        @keyframes saBreathe { 0%,100%{ opacity:.55; transform:translate(-50%,-50%) scale(1);} 50%{ opacity:1; transform:translate(-50%,-50%) scale(1.08);} }
        @media (prefers-reduced-motion: reduce){ .sa-recent-star{ animation:none !important; } }
      `}</style>
      {pts.map((p: StarPoint, i: number) => {
        const isRecent = i === 0
        const color = isRecent ? "#E8A87C" : "#D9A06E"
        return (
          <span key={i} style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%,-50%)" }}>
            {(p.big || isRecent) && (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  transform: "translate(-50%,-50%)",
                  width: p.size * 3.4,
                  height: p.size * 3.4,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${isRecent ? "rgba(232,168,124,0.40)" : "rgba(217,160,110,0.28)"} 0%, rgba(217,160,110,0) 70%)`,
                  opacity: lit ? p.depth : 0,
                  transition: `opacity 1100ms ease ${p.delay}ms`,
                }}
              />
            )}
            <span
              className={isRecent ? "sa-recent-star" : undefined}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                transform: "translate(-50%,-50%)",
                width: p.size,
                height: p.size,
                borderRadius: "50%",
                background: color,
                opacity: lit ? p.depth : 0,
                transition: `opacity 1000ms ease ${p.delay}ms`,
                animation: isRecent ? "saBreathe 3.4s ease-in-out infinite 1200ms" : "none",
                boxShadow: isRecent ? "0 0 6px rgba(232,168,124,0.7)" : "none",
              }}
            />
          </span>
        )
      })}
    </div>
  )
}

export function MyTimeSheet({ open, onOpenChange, stats, mostCommonTrigger, isLoggedIn, onCreateSpace }: MyTimeSheetProps) {
  const { language, t } = useLanguage()
  const lang = language

  const completed = useMemo<Session[]>(() => (stats ? stats.sessions.filter((s) => s.completed) : []), [stats])
  const blocks = stats?.completedBlocks ?? 0
  const totalMinutes = stats?.totalMinutes ?? 0

  const triggerLabel = (tr: TriggerType) => t.triggers[tr]

  const echo = useMemo(
    () => buildEcho(completed, mostCommonTrigger, triggerLabel, lang),
    [completed, mostCommonTrigger, lang]
  )

  // long-term milestone (text) — only when the journey actually spans real time,
  // not just when there are many sessions in a single day
  const milestoneSpanDays = useMemo(() => {
    if (completed.length === 0) return 0
    const oldest = completed[completed.length - 1]
    return Math.floor((Date.now() - new Date(oldest.date).getTime()) / 86400000)
  }, [completed])

  const showMilestone = blocks >= 20 && milestoneSpanDays >= 14

  const milestone = useMemo(() => {
    if (!showMilestone) return ""
    const days = milestoneSpanDays
    const months = Math.round(days / 30)
    const weeks = Math.round(days / 7)
    if (lang === "zh") {
      if (months >= 2) return `${months} 个月里，你回到这里 ${blocks} 次`
      return `${weeks} 周里，你回到这里 ${blocks} 次`
    }
    if (months >= 2) return `over ${months} months, you've come back ${blocks} times`
    return `over ${weeks} weeks, you've come back ${blocks} times`
  }, [showMilestone, milestoneSpanDays, blocks, lang])

  const totalText = formatDuration(totalMinutes, language)

  const hasSessions = completed.length > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full border-l border-[#E5E0DA] bg-[#F7F5F2] p-0 sm:max-w-[480px]">
        <div className="mx-auto h-full max-w-[400px] overflow-y-auto px-7 pb-16 pt-16 text-center sm:text-left">
          {/* ① greeting */}
          <p className="text-[15px] font-light text-[#8A8A8A]">{getGreeting(lang)}</p>
          <p className="mt-1.5 text-[13px] font-light text-[#A8A8A8]">{t.mySpaceSubline}</p>

          {hasSessions ? (
            <>
              {/* ② accumulation */}
              <div className="mt-14">
                <p className="text-[15px] font-light text-[#8A8A8A]">{t.pausedForYourself}</p>
                <p className="mt-2.5 text-[44px] font-medium leading-none tracking-tight text-[#1A1A1A]">
                  {blocks}
                  <span className="ml-2 text-[20px] font-light text-[#8A8A8A]">
                    {lang === "en" && blocks === 1 ? "time" : t.timesUnit}
                  </span>
                </p>
                <p className="mt-3 text-[15px] font-light text-[#A8A8A8]">
                  {lang === "zh" ? `一共 ${totalText}` : `${totalText} in all`}
                </p>
              </div>

              {/* ③ trace: stars + milestone */}
              <div className="mt-14">
                <p className="text-[13px] font-light tracking-wide text-[#A8A8A8]">{t.traceTitle}</p>
                <p className="mt-1 text-[12px] font-light leading-relaxed text-[#A8A8A8] opacity-85">
                  {t.traceCaption}
                </p>
                <Stars sessions={completed} />
                {showMilestone && (
                  <p className="mt-3.5 text-center text-[13px] font-light leading-relaxed text-[#8A8A8A]">
                    {milestone}
                  </p>
                )}
              </div>

              {/* ④ echo */}
              <div className="mt-12 border-t border-[#1A1A1A]/10 pt-7">
                <p
                  className={`text-[#1A1A1A] ${lang === "zh" ? "text-[16px]" : "text-[15px] italic"} font-light leading-[1.7]`}
                >
                  {echo}
                </p>
              </div>

              {/* recently — text stream that supplements the stars */}
              <div className="mt-11">
                <p className="mb-3.5 text-[12px] font-light text-[#A8A8A8]">{t.recentMoments}</p>
                {completed.slice(0, 4).map((s: Session) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between border-b border-[#1A1A1A]/[0.05] py-2.5"
                  >
                    <span className="text-[13px] font-light text-[#1A1A1A]">
                      {s.duration} {lang === "zh" ? "分钟" : "min"}
                      <span className="text-[#A8A8A8]"> · {t.triggers[s.trigger]}</span>
                    </span>
                    <span className="text-[12px] font-light text-[#A8A8A8]">{relativeTime(s.date, lang)}</span>
                  </div>
                ))}
              </div>

              {/* gentle invitation to register — last of all, after they've seen
                  everything. Only when not logged in and the local space is full.
                  No mention of the limit; just a quiet, positive choice. */}
              {!isLoggedIn && stats && isLocalCapReached(stats) && (
                <p className="mt-12 border-t border-[#1A1A1A]/10 pt-7 text-center text-[14px] font-light leading-relaxed text-[#8A8A8A]">
                  {t.lingerLead}{" "}
                  <button
                    onClick={onCreateSpace}
                    className="text-[#1A1A1A] underline decoration-[#D9CFC4] decoration-1 underline-offset-[5px] transition-colors hover:decoration-[#C5B8A8]"
                  >
                    {t.lingerAction}
                  </button>
                </p>
              )}
            </>
          ) : (
            /* empty state — an invitation, not a void */
            <div className="mt-24 text-center">
              <span
                className="sa-recent-star mx-auto mb-7 block h-3 w-3 rounded-full"
                style={{ background: "#E8A87C", boxShadow: "0 0 8px rgba(232,168,124,0.7)" }}
              />
              <p className="text-[15px] font-light leading-relaxed text-[#8A8A8A]">{t.noSessions}</p>
            </div>
          )}

          {/* signature */}
          <p
            className="wordmark mt-16 text-center text-[#B8B3AD]"
            style={{ fontSize: "13px", letterSpacing: "0.34em" }}
          >
            Stay Alone
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
