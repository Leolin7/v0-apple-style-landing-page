"use client"

import { useLanguage } from "@/lib/language-context"
import { formatDuration } from "@/lib/translations"
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
}

export function MyTimeSheet({
  open,
  onOpenChange,
  stats,
  mostCommonTrigger,
}: MyTimeSheetProps) {
  const { language, t } = useLanguage()

  const formatSessionDate = (dateStr: string) => {
    const date = new Date(dateStr)
    if (language === "zh") {
      return `${date.getMonth() + 1}月${date.getDate()}日`
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="border-[#e5e5e5] bg-white text-[#1a1a1a]"
      >
        <SheetHeader className="pb-6">
          <SheetTitle className="text-xl font-light tracking-wide text-[#1a1a1a]">
            {t.myTime}
          </SheetTitle>
          <SheetDescription className="text-sm font-light text-[#a1a1a6]">
            {stats
              ? formatDuration(stats.totalMinutes, language)
              : formatDuration(0, language)}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-8 overflow-y-auto pb-8">
          {/* Stats */}
          {stats && (
            <>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="mb-1 text-xs font-light uppercase tracking-wider text-[#a1a1a6]">
                    {t.today}
                  </p>
                  <p className="text-lg font-light text-[#1a1a1a]">
                    {formatDuration(stats.todayMinutes, language)}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-light uppercase tracking-wider text-[#a1a1a6]">
                    {t.thisWeek}
                  </p>
                  <p className="text-lg font-light text-[#1a1a1a]">
                    {formatDuration(stats.weekMinutes, language)}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-light uppercase tracking-wider text-[#a1a1a6]">
                    {t.completedBlocks}
                  </p>
                  <p className="text-lg font-light text-[#1a1a1a]">
                    {stats.completedBlocks}{" "}
                    {stats.completedBlocks === 1 ? t.block : t.blocks}
                  </p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-light uppercase tracking-wider text-[#a1a1a6]">
                    {t.whatPullsYou}
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
                    {stats.sessions.slice(0, 10).map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-light text-[#1a1a1a]">
                            {t.triggers[session.trigger]}
                          </p>
                          <p className="text-xs font-light text-[#a1a1a6]">
                            {formatSessionDate(session.date)}
                          </p>
                        </div>
                        <p className="text-sm font-light text-[#6e6e73]">
                          {formatDuration(session.duration, language)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Future features placeholder */}
              <div className="mt-4 rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-5">
                <p className="mb-2 text-sm font-light text-[#6e6e73]">
                  {t.futureTitle}
                </p>
                <p className="text-xs font-light leading-relaxed text-[#a1a1a6]">
                  {t.futureSubcopy}
                </p>
              </div>
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
