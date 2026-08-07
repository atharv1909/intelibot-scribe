-- Supervisor decisions table for autonomous pipeline supervision
CREATE TABLE IF NOT EXISTS public.supervisor_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  from_stage INT NOT NULL,
  to_stage INT NOT NULL,
  decision_type TEXT NOT NULL DEFAULT 'advance',
  reasoning TEXT NOT NULL DEFAULT '',
  agent_context JSONB DEFAULT '{}',
  confidence FLOAT DEFAULT 0.0,
  approved BOOLEAN DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_supervisor_decisions_project ON public.supervisor_decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_decisions_created ON public.supervisor_decisions(created_at DESC);

-- RLS
ALTER TABLE public.supervisor_decisions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supervisor_decisions TO authenticated;
GRANT ALL ON public.supervisor_decisions TO service_role;

CREATE POLICY "users see own supervisor decisions" ON public.supervisor_decisions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
