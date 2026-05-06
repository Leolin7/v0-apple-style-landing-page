-- Stay Alone Sessions Table
-- Run this in your Supabase SQL Editor

-- Create the stay_alone_sessions table
CREATE TABLE IF NOT EXISTS stay_alone_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_timestamp TIMESTAMPTZ NOT NULL,
  end_timestamp TIMESTAMPTZ,
  actual_elapsed_seconds INTEGER NOT NULL,
  selected_duration_seconds INTEGER,
  trigger TEXT,
  status TEXT NOT NULL CHECK (status IN ('completed', 'pulled_away', 'finished_early')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create an index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_stay_alone_sessions_user_id ON stay_alone_sessions(user_id);

-- Create an index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_stay_alone_sessions_created_at ON stay_alone_sessions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE stay_alone_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own sessions

-- Policy: Users can SELECT their own sessions
CREATE POLICY "Users can view their own sessions"
  ON stay_alone_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can INSERT their own sessions
CREATE POLICY "Users can insert their own sessions"
  ON stay_alone_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can UPDATE their own sessions
CREATE POLICY "Users can update their own sessions"
  ON stay_alone_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can DELETE their own sessions
CREATE POLICY "Users can delete their own sessions"
  ON stay_alone_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
