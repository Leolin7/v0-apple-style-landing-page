export type TriggerType = "shortVideos" | "messages" | "work" | "ai" | "anxiety" | "boredom" | "world"

export interface Session {
  id: string
  date: string
  duration: number // in minutes (for stats)
  durationSeconds?: number // actual elapsed seconds (for display)
  trigger: TriggerType
  completed: boolean
  pulledAwayCount: number
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

const STORAGE_KEY = "stayalone_stats"
const VISITOR_KEY = "stayalone_visitor"
const USER_KEY = "stayalone_user"

export interface UserAccount {
  id: string
  email: string
  passwordHash: string // Simple hash for mock auth
  createdAt: string
}

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

export function loadStats(): UserStats {
  if (typeof window === "undefined") return getDefaultStats()
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return getDefaultStats()
    
    const stats = JSON.parse(stored) as UserStats
    return recalculateStats(stats)
  } catch {
    return getDefaultStats()
  }
}

export function saveStats(stats: UserStats): void {
  if (typeof window === "undefined") return
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
  } catch {
    // Storage full or unavailable
  }
}

export function addSession(
  duration: number,
  trigger: TriggerType,
  completed: boolean,
  pulledAwayCount: number,
  durationSeconds?: number
): UserStats {
  const stats = loadStats()
  const now = new Date().toISOString()
  
  const session: Session = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    date: now,
    duration,
    durationSeconds,
    trigger,
    completed,
    pulledAwayCount,
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
  saveStats(updatedStats)
  return updatedStats
}

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

export function hasVisited(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(VISITOR_KEY) === "true"
}

export function markVisited(): void {
  if (typeof window === "undefined") return
  localStorage.setItem(VISITOR_KEY, "true")
}

// Simple hash function for mock auth (not secure, just for demo)
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

export function createAccount(email: string, password: string): { success: boolean; error?: string } {
  if (typeof window === "undefined") return { success: false, error: "Not available" }
  
  try {
    // Check if user already exists
    const existingUser = localStorage.getItem(USER_KEY)
    if (existingUser) {
      const user = JSON.parse(existingUser) as UserAccount
      if (user.email === email) {
        return { success: false, error: "Account already exists" }
      }
    }
    
    const user: UserAccount = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      passwordHash: simpleHash(password),
      createdAt: new Date().toISOString(),
    }
    
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    return { success: true }
  } catch {
    return { success: false, error: "Failed to create account" }
  }
}

export function signIn(email: string, password: string): { success: boolean; error?: string } {
  if (typeof window === "undefined") return { success: false, error: "Not available" }
  
  try {
    const stored = localStorage.getItem(USER_KEY)
    if (!stored) {
      return { success: false, error: "Account not found" }
    }
    
    const user = JSON.parse(stored) as UserAccount
    if (user.email !== email) {
      return { success: false, error: "Account not found" }
    }
    
    if (user.passwordHash !== simpleHash(password)) {
      return { success: false, error: "Invalid password" }
    }
    
    return { success: true }
  } catch {
    return { success: false, error: "Failed to sign in" }
  }
}

export function signOut(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(USER_KEY)
}

export function getCurrentUser(): UserAccount | null {
  if (typeof window === "undefined") return null
  
  try {
    const stored = localStorage.getItem(USER_KEY)
    if (!stored) return null
    return JSON.parse(stored) as UserAccount
  } catch {
    return null
  }
}

export function isSignedIn(): boolean {
  return getCurrentUser() !== null
}
