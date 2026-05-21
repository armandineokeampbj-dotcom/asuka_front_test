
ALTER TABLE public.pulses
  ADD COLUMN IF NOT EXISTS reward_points integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS questions jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.pulse_responses
  ADD COLUMN IF NOT EXISTS question_id text;

-- Allow multiple responses per pulse (one per question). Drop any unique on (user_id,pulse_id) if present.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.pulse_responses'::regclass AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.pulse_responses DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS pulse_responses_user_pulse_question_uidx
  ON public.pulse_responses (user_id, pulse_id, COALESCE(question_id, ''));
