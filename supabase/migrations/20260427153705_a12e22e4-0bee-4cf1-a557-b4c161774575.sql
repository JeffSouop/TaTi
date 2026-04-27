
-- Table extensible pour stocker N providers LLM
CREATE TABLE public.llm_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  name text NOT NULL,
  api_key text,
  base_url text,
  default_model text NOT NULL,
  temperature real NOT NULL DEFAULT 0.7,
  max_tool_iterations integer NOT NULL DEFAULT 10,
  enabled boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index unique partiel : un seul provider par défaut à la fois
CREATE UNIQUE INDEX llm_providers_one_default
  ON public.llm_providers ((is_default))
  WHERE is_default = true;

ALTER TABLE public.llm_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public all llm_providers"
  ON public.llm_providers FOR ALL
  USING (true) WITH CHECK (true);

-- Liaison conversation -> provider/modèle
ALTER TABLE public.conversations
  ADD COLUMN provider_id uuid REFERENCES public.llm_providers(id) ON DELETE SET NULL,
  ADD COLUMN model text;
