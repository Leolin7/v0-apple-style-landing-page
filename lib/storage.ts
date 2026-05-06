export type TriggerType = "shortVideos" | "messages" | "work" | "ai" | "anxiety" | "boredom" | "world"

export interface Session {
  id: string
  date: string
  duration: number // in minutes (for stats)
  durationSeconds?: number // actual elapsed seconds (for display)
  trigger: TriggerType
  completed: boolean
  pulledAwayCount: number
  // New fields for Supabase sync
  startTimestamp?: number
  endTimestamp?: number
  status?: 'completed' | 'pulled_away' | 'finished_early'
  syncedToSupabase?: boolean
}

export interface UserStats {
  totalMinutes: number
  todayMinutes: number
  weekMinutes: number
  completedBlocks: number
  triggerCounts: Record<TriggerType, number>
  sessions: Session[]
  currentStreak: number
  lastSessionDate: string | null
}

const LOCAL_STORAGE_KEY = "stayalone_local_stats"
const UPLOADED_IDS_KEY = "stayalone_uploaded_ids"

export function getDefaultStats(): UserStats {
  return {
    totalMinutes: 0,
    todayMinutes: 0,
    weekMinutes: 0,
    completedBlocks: 0,
    triggerCounts: {
      shortVideos: 0,
      messages: 0,
      work: 0,
      ai: 0,
      anxiety: 0,
      boredom: 0,
      world: 0,
    },
    sessions: [],
    currentStreak: 0,
    lastSessionDate: null,
  }
}

function isToday(dateStr: string): boolean {
  const date = new Date(dateStr)
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

function isThisWeek(dateStr: string): boolean {
  const date = new Date(dateStr)
  const today = new Date()
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  return date >= weekAgo && date <= today
}

function recalculateStats(stats: UserStats): UserStats {
  let todayMinutes = 0
  let weekMinutes = 0

  stats.sessions.forEach((session) => {
    if (session.completed) {
      if (isToday(session.date)) {
        todayMinutes += session.duration
      }
      if (isThisWeek(session.date)) {
        weekMinutes += session.duration
      }
    }
  })

  return {
    ...stats,
    todayMinutes,
    weekMinutes,
  }
}

// Local storage functions (for unauthenticated users)
export function loadLocalStats(): UserStats {
  if (typeof window === "undefined") return getDefaultStats()
  
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!stored) return getDefaultStats()
    
    const stats = JSON.parse(stored) as UserStats
    return recalculateStats(stats)
  } catch {
    return getDefaultStats()
  }
}

export function saveLocalStats(stats: UserStats): void {
  if (typeof window === "undefined") return
  
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stats))
  } catch {
    // Storage full or unavailable
  }
}

export function addLocalSession(
  duration: number,
  trigger: TriggerType,
  completed: boolean,
  pulledAwayCount: number,
  durationSeconds?: number,
  startTimestamp?: number,
  endTimestamp?: number
): UserStats {
  const stats = loadLocalStats()
  const now = new Date().toISOString()
  
  const status: 'completed' | 'pulled_away' | 'finished_early' = 
    !completed ? 'pulled_away' : 
    (durationSeconds && durationSeconds < duration * 60) ? 'finished_early' : 'completed'
  
  const session: Session = {
    id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    date: now,
    duration,
    durationSeconds,
    trigger,
    completed,
    pulledAwayCount,
    startTimestamp,
    endTimestamp,
    status,
    syncedToSupabase: false,
  }
  
  stats.sessions.unshift(session)
  
  if (completed) {
    stats.totalMinutes += duration
    stats.completedBlocks += 1
    stats.triggerCounts[trigger] = (stats.triggerCounts[trigger] || 0) + 1
    
    // Update streak
    const lastDate = stats.lastSessionDate
    if (lastDate) {
      const lastSessionDay = new Date(lastDate).toDateString()
      const today = new Date().toDateString()
      const yesterday = new Date(Date.now() - 86400000).toDateString()
      
      if (lastSessionDay === yesterday) {
        stats.currentStreak += 1
      } else if (lastSessionDay !== today) {
        stats.currentStreak = 1
      }
    } else {
      stats.currentStreak = 1
    }
    
    stats.lastSessionDate = now
  }
  
  const updatedStats = recalculateStats(stats)
  saveLocalStats(updatedStats)
  return updatedStats
}

// Get unsynced local sessions for upload to Supabase
export function getUnsyncedLocalSessions(): Session[] {
  const stats = loadLocalStats()
  return stats.sessions.filter(s => !s.syncedToSupabase && s.completed)
}

// Mark local sessions as synced
export function markLocalSessionsSynced(sessionIds: string[]): void {
  const stats = loadLocalStats()
  stats.sessions = stats.sessions.map(session => {
    if (sessionIds.includes(session.id)) {
      return { ...session, syncedToSupabase: true }
    }
    return session
  })
  saveLocalStats(stats)
  
  // Also track uploaded IDs to prevent duplicates
  const existingIds = getUploadedSessionIds()
  const newIds = [...new Set([...existingIds, ...sessionIds])]
  saveUploadedSessionIds(newIds)
}

// Track which session IDs have been uploaded
function getUploadedSessionIds(): string[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(UPLOADED_IDS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveUploadedSessionIds(ids: string[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(UPLOADED_IDS_KEY, JSON.stringify(ids))
  } catch {
    // Storage full or unavailable
  }
}

// Clear local stats after successful sync
export function clearLocalStats(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(LOCAL_STORAGE_KEY)
}

// Helper to get most common trigger
export function getMostCommonTrigger(stats: UserStats): TriggerType | null {
  let maxCount = 0
  let mostCommon: TriggerType | null = null
  
  Object.entries(stats.triggerCounts).forEach(([trigger, count]) => {
    if (count > maxCount) {
      maxCount = count
      mostCommon = trigger as TriggerType
    }
  })
  
  return mostCommon
}

// Convert Supabase sessions to UserStats format
export function supabaseSessionsToStats(sessions: Array<{
  id: string
  start_timestamp: string
  end_timestamp: string | null
  actual_elapsed_seconds: number
  selected_duration_seconds: number | null
  trigger: string | null
  status: string
  created_at: string
}>): UserStats {
  const stats = getDefaultStats()
  
  sessions.forEach(session => {
    const trigger = (session.trigger || 'world') as TriggerType
    const completed = session.status === 'completed' || session.status === 'finished_early'
    const durationMinutes = Math.ceil(session.actual_elapsed_seconds / 60)
    
    const localSession: Session = {
      id: session.id,
      date: session.created_at,
      duration: durationMinutes,
      durationSeconds: session.actual_elapsed_seconds,
      trigger,
      completed,
      pulledAwayCount: session.status === 'pulled_away' ? 1 : 0,
      startTimestamp: new Date(session.start_timestamp).getTime(),
      endTimestamp: session.end_timestamp ? new Date(session.end_timestamp).getTime() : undefined,
      status: session.status as 'completed' | 'pulled_away' | 'finished_early',
      syncedToSupabase: true,
    }
    
    stats.sessions.push(localSession)
    
    if (completed) {
      stats.totalMinutes += durationMinutes
      stats.completedBlocks += 1
      stats.triggerCounts[trigger] = (stats.triggerCounts[trigger] || 0) + 1
    }
  })
  
  // Sort sessions by date (newest first)
  stats.sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  if (stats.sessions.length > 0) {
    stats.lastSessionDate = stats.sessions[0].date
  }
  
  return recalculateStats(stats)
}

// Merge local and Supabase stats (for display when user has both)
export function mergeStats(local: UserStats, supabase: UserStats): UserStats {
  const merged = getDefaultStats()
  
  // Combine sessions, avoiding duplicates
  const allSessions = [...supabase.sessions]
  const supabaseIds = new Set(supabase.sessions.map(s => s.id))
  
  local.sessions.forEach(session => {
    if (!supabaseIds.has(session.id) && !session.syncedToSupabase) {
      allSessions.push(session)
    }
  })
  
  // Sort by date
  allSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  merged.sessions = allSessions
  
  // Recalculate totals
  allSessions.forEach(session => {
    if (session.completed) {
      merged.totalMinutes += session.duration
      merged.completedBlocks += 1
      merged.triggerCounts[session.trigger] = (merged.triggerCounts[session.trigger] || 0) + 1
    }
  })
  
  if (allSessions.length > 0) {
    merged.lastSessionDate = allSessions[0].date
  }
  
  return recalculateStats(merged)
}
