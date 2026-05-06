import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for database
export interface StayAloneSession {
  id: string
  user_id: string
  start_timestamp: string
  end_timestamp: string | null
  actual_elapsed_seconds: number
  selected_duration_seconds: number | null
  trigger: string | null
  status: 'completed' | 'pulled_away' | 'finished_early'
  created_at: string
}

// Auth helpers
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  
  if (error) {
    return { success: false, error: error.message, needsVerification: false }
  }
  
  // Check if email confirmation is required
  const needsVerification = data.user && !data.session
  
  return { success: true, needsVerification, user: data.user }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) {
    // Check for specific error types
    if (error.message.includes('Email not confirmed')) {
      return { success: false, error: 'email_not_verified' }
    }
    return { success: false, error: error.message }
  }
  
  return { success: true, user: data.user, session: data.session }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { success: !error, error: error?.message }
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// Session saving helpers
export async function saveStayAloneSession(session: {
  startTimestamp: number
  endTimestamp: number
  actualElapsedSeconds: number
  selectedDurationSeconds: number
  trigger: string
  status: 'completed' | 'pulled_away' | 'finished_early'
}) {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }
  
  const { data, error } = await supabase
    .from('stay_alone_sessions')
    .insert({
      user_id: user.id,
      start_timestamp: new Date(session.startTimestamp).toISOString(),
      end_timestamp: new Date(session.endTimestamp).toISOString(),
      actual_elapsed_seconds: session.actualElapsedSeconds,
      selected_duration_seconds: session.selectedDurationSeconds,
      trigger: session.trigger,
      status: session.status,
    })
    .select()
    .single()
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}

export async function getStayAloneSessions() {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: 'Not authenticated', data: [] }
  }
  
  const { data, error } = await supabase
    .from('stay_alone_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  
  if (error) {
    return { success: false, error: error.message, data: [] }
  }
  
  return { success: true, data: data as StayAloneSession[] }
}

export async function deleteStayAloneSession(id: string) {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }
  
  const { error } = await supabase
    .from('stay_alone_sessions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

// Bulk upload local sessions
export async function uploadLocalSessions(sessions: Array<{
  startTimestamp: number
  endTimestamp: number
  actualElapsedSeconds: number
  selectedDurationSeconds: number
  trigger: string
  status: 'completed' | 'pulled_away' | 'finished_early'
}>) {
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }
  
  const records = sessions.map(session => ({
    user_id: user.id,
    start_timestamp: new Date(session.startTimestamp).toISOString(),
    end_timestamp: new Date(session.endTimestamp).toISOString(),
    actual_elapsed_seconds: session.actualElapsedSeconds,
    selected_duration_seconds: session.selectedDurationSeconds,
    trigger: session.trigger,
    status: session.status,
  }))
  
  const { data, error } = await supabase
    .from('stay_alone_sessions')
    .insert(records)
    .select()
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}
