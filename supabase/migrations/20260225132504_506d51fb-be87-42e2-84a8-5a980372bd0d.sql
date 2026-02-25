
CREATE TABLE public.drill_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'beginner',
  duration_seconds INTEGER NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  wpm INTEGER NOT NULL DEFAULT 0,
  total_fillers INTEGER NOT NULL DEFAULT 0,
  filler_words JSONB NOT NULL DEFAULT '{}'::jsonb,
  pause_count INTEGER NOT NULL DEFAULT 0,
  clarity_score INTEGER NOT NULL DEFAULT 0,
  ai_relevance INTEGER,
  ai_coherence INTEGER,
  ai_quality INTEGER,
  ai_summary TEXT,
  ai_strengths JSONB,
  ai_improvements JSONB,
  completed BOOLEAN NOT NULL DEFAULT false
);

-- Allow anonymous inserts and reads (no auth required for now)
ALTER TABLE public.drill_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous insert" ON public.drill_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous select" ON public.drill_sessions FOR SELECT USING (true);
CREATE POLICY "Allow anonymous update" ON public.drill_sessions FOR UPDATE USING (true);
