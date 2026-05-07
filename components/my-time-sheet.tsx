"use client"

import { useLanguage } from "@/lib/language-context"
import { formatDuration, formatElapsedDuration } from "@/lib/translations"
import type { UserStats, TriggerType } from "@/lib/storage"
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet"

interface MyTimeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stats: UserStats | null
  mostCommonTrigger: TriggerType | null
  onSignOut: () => void
  isLoggedIn: boolean
}

export function MyTimeSheet({
  open,
  onOpenChange,
  stats,
  mostCommonTrigger,
  onSignOut,
  isLoggedIn,
}: MyTimeSheetProps) {
  const { language, t } = useLanguage()

  const formatSessionDate = (dateStr: string) => {
    const date = new Date(dateStr)
    if (language === "zh") {
      return `${date.getMonth() + 1}月${date.getDate()}日`
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  // Format session duration for recent moments
  const formatSessionDuration = (durationSeconds: number | undefined, duration: number) => {
    if (durationSeconds !== undefined) {
      return formatElapsedDuration(durationSeconds, language)
    }
    return formatDuration(duration, language)
  }

  // Format the "most pulled away by" text
  const getMostPulledAwayText = () => {
    if (!mostCommonTrigger) return "—"
    const triggerName = t.triggers[mostCommonTrigger]
    if (language === "zh") {
      return `${t.mostPulledAwayBy}${triggerName}${(t as typeof t & { mostPulledAwayBySuffix?: string }).mostPulledAwayBySuffix || ""}`
    }
    return `${t.mostPulledAwayBy} ${triggerName.toLowerCase()}`
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full border-l border-[#E3E3E3] bg-[#FAFAF8] p-0 sm:max-w-[520px]"
      >
        {/* Content container - centered with max-width */}
        <div className="mx-auto h-full max-w-[440px] overflow-y-auto px-6 pb-10 pt-16">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-[28px] font-light tracking-tight text-[#222222] md:text-[32px]">
              {t.mySpace}
            </h1>
            <p className="mt-1 text-[14px] font-light text-[#9A9AA0]">
              {t.mySpaceSubline}
            </p>
          </div>

          {stats ? (
            <div className="flex flex-col gap-8">
              {/* Main summary card */}
              <div className="rounded-2xl border border-[#E3E3E3] bg-white px-6 py-7">
                <p className="text-[36px] font-light leading-tight tracking-tight text-[#222222] md:text-[42px]">
                  {formatDuration(stats.totalMinutes, language)}
                </p>
                <p className="mt-1 text-[14px] font-light text-[#9A9AA0]">
                  {t.madeYours}
                </p>
              </div>

              {/* Secondary stats - subtle rows */}
              <div className="flex flex-col gap-3 px-1">
                <p className="text-[14px] font-light text-[#222222]">
                  <span className="text-[#9A9AA0]">{stats.completedBlocks}</span>
                  {" "}
                  {language === "zh" ? t.blocksCompleted : `${t.blocksCompleted}`}
                </p>
                <p className="text-[14px] font-light text-[#222222]">
                  {getMostPulledAwayText()}
                </p>
              </div>

              {/* Recent moments */}
              {stats.sessions.filter(s => s.completed).length > 0 && (
                <div className="mt-2">
                  <p className="mb-4 px-1 text-[13px] font-light text-[#9A9AA0]">
                    {t.recentMoments}
                  </p>
                  <div className="flex flex-col gap-2">
                    {stats.sessions
                      .filter((s) => s.completed)
                      .slice(0, 5)
                      .map((session) => (
                        <div
                          key={session.id}
                          className="flex h-[56px] items-center justify-between rounded-xl border border-[#E3E3E3] bg-white px-4"
                        >
                          <p className="text-[13px] font-light text-[#222222]">
                            {formatSessionDuration(session.durationSeconds, session.duration)}
                            <span className="text-[#9A9AA0]"> · {t.triggers[session.trigger]}</span>
                          </p>
                          <p className="text-[12px] font-light text-[#9A9AA0]">
                            {formatSessionDate(session.date)}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Future personalisation section */}
              <div className="mt-4 rounded-xl border border-[#E3E3E3] px-5 py-4">
                <p className="text-[13px] font-light text-[#9A9AA0]">
                  {t.futureTitle}
                </p>
                <p className="mt-1 text-[12px] font-light leading-relaxed text-[#9A9AA0]">
                  {t.futureSubcopy}
                </p>
              </div>

              {/* Sign out */}
              {isLoggedIn && (
                <button
                  onClick={onSignOut}
                  className="mt-4 self-start px-1 text-[12px] font-light text-[#9A9AA0] transition-colors hover:text-[#77777D]"
                >
                  {t.signOut}
                </button>
              )}
            </div>
          ) : (
            /* No stats yet */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-[14px] font-light text-[#9A9AA0]">
                {t.noSessions}
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
