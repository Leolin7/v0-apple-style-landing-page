"use client"

import { useLanguage } from "@/lib/language-context"
import { formatDuration, formatElapsedDuration } from "@/lib/translations"
import type { UserStats, TriggerType } from "@/lib/storage"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
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

  // Format recent session display: "14 minutes 38 seconds · Short videos"
  const formatSessionDisplay = (durationSeconds: number | undefined, duration: number, trigger: TriggerType) => {
    // Use elapsed seconds if available, otherwise fall back to minutes
    const durationStr = durationSeconds !== undefined
      ? formatElapsedDuration(durationSeconds, language)
      : formatDuration(duration, language)
    const triggerStr = t.triggers[trigger]
    return `${durationStr} · ${triggerStr}`
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="border-[#e5e5e5] bg-white text-[#1a1a1a]"
      >
        <SheetHeader className="pb-6">
          <SheetTitle className="text-xl font-light tracking-wide text-[#1a1a1a]">
            {t.mySpace}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Your personal Stay Alone space
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-8 overflow-y-auto pb-8">
          {/* Stats */}
          {stats && (
            <>
              {/* My Time section header */}
              <h3 className="text-sm font-light uppercase tracking-wider text-[#6e6e73]">
                {t.myTime}
              </h3>

              <div className="grid grid-cols-1 gap-6">
                {/* Total time made yours */}
                <div>
                  <p className="mb-1 text-xs font-light uppercase tracking-wider text-[#a1a1a6]">
                    {t.totalTimeMadeYours}
                  </p>
                  <p className="text-2xl font-light text-[#1a1a1a]">
                    {formatDuration(stats.totalMinutes, language)}
                  </p>
                </div>

                {/* Completed blocks */}
                <div>
                  <p className="mb-1 text-xs font-light uppercase tracking-wider text-[#a1a1a6]">
                    {t.completedBlocks}
                  </p>
                  <p className="text-lg font-light text-[#1a1a1a]">
                    {stats.completedBlocks}{" "}
                    {stats.completedBlocks === 1 ? t.block : t.blocks}
                  </p>
                </div>

                {/* What pulls you away most */}
                <div>
                  <p className="mb-1 text-xs font-light uppercase tracking-wider text-[#a1a1a6]">
                    {t.whatPullsYouMost}
                  </p>
                  <p className="text-lg font-light text-[#1a1a1a]">
                    {mostCommonTrigger ? t.triggers[mostCommonTrigger] : "—"}
                  </p>
                </div>
              </div>

              {/* Recent sessions */}
              <div>
                <p className="mb-4 text-xs font-light uppercase tracking-wider text-[#a1a1a6]">
                  {t.recentSessions}
                </p>
                {stats.sessions.length === 0 ? (
                  <p className="text-sm font-light text-[#a1a1a6]">
                    {t.noSessions}
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {stats.sessions
                      .filter((s) => s.completed)
                      .slice(0, 10)
                      .map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-4 py-3"
                        >
                          <p className="text-sm font-light text-[#1a1a1a]">
                            {formatSessionDisplay(session.durationSeconds, session.duration, session.trigger)}
                          </p>
                          <p className="text-xs font-light text-[#a1a1a6]">
                            {formatSessionDate(session.date)}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Future features placeholder */}
              <div className="rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-5">
                <p className="mb-2 text-sm font-light text-[#6e6e73]">
                  {t.futureTitle}
                </p>
                <p className="text-xs font-light leading-relaxed text-[#a1a1a6]">
                  {t.futureSubcopy}
                </p>
              </div>

              {/* Sign out button */}
              {isLoggedIn && (
                <button
                  onClick={onSignOut}
                  className="mt-2 text-xs font-light tracking-wide text-[#a1a1a6] transition-colors hover:text-[#6e6e73]"
                >
                  {t.signOut}
                </button>
              )}
            </>
          )}

          {/* No stats yet */}
          {!stats && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-base font-light text-[#a1a1a6]">
                {t.noSessions}
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
