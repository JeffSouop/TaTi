-- Schéma Postgres reproduisant les tables du projet Supabase Cloud.
-- Exécuté automatiquement au premier démarrage du container postgres.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- users / sessions (auth locale)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name    TEXT NOT NULL DEFAULT '',
  last_name     TEXT NOT NULL DEFAULT '',
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'member',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_exp ON public.user_sessions(expires_at);

-- ---------------------------------------------------------------------------
-- app_settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
  id                  INTEGER PRIMARY KEY DEFAULT 1,
  default_model       TEXT    NOT NULL DEFAULT 'llama3',
  ollama_url          TEXT    NOT NULL DEFAULT 'http://localhost:11434',
  temperature         REAL    NOT NULL DEFAULT 0.7,
  max_tool_iterations INTEGER NOT NULL DEFAULT 10,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- llm_providers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.llm_providers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  kind                TEXT NOT NULL,
  base_url            TEXT,
  api_key             TEXT,
  default_model       TEXT NOT NULL,
  temperature         REAL NOT NULL DEFAULT 0.7,
  max_tool_iterations INTEGER NOT NULL DEFAULT 10,
  enabled             BOOLEAN NOT NULL DEFAULT true,
  is_default          BOOLEAN NOT NULL DEFAULT false,
  extra               JSONB   NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.llm_providers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_llm_providers_user_id ON public.llm_providers(user_id);

-- ---------------------------------------------------------------------------
-- mcp_servers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mcp_servers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  url        TEXT NOT NULL,
  headers    JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled    BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mcp_servers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_mcp_servers_user_id ON public.mcp_servers(user_id);

-- Acces aux serveurs MCP par utilisateur (si aucune ligne pour un user => acces complet)
-- Doit etre cree APRES mcp_servers (FK mcp_server_id -> mcp_servers.id).
CREATE TABLE IF NOT EXISTS public.user_mcp_access (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mcp_server_id UUID NOT NULL REFERENCES public.mcp_servers(id) ON DELETE CASCADE,
  allowed       BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, mcp_server_id)
);
CREATE INDEX IF NOT EXISTS idx_user_mcp_access_user ON public.user_mcp_access(user_id);

-- ---------------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL DEFAULT 'Nouvelle conversation',
  provider_id UUID REFERENCES public.llm_providers(id) ON DELETE SET NULL,
  model       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,
  content         TEXT NOT NULL DEFAULT '',
  tool_calls      JSONB,
  tool_call_id    TEXT,
  tool_name       TEXT,
  server_name     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON public.messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON public.messages(conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- Singleton row pour app_settings
-- ---------------------------------------------------------------------------
INSERT INTO public.app_settings (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Realtime : trigger qui NOTIFY sur le canal `tati_changes` à chaque
-- INSERT/UPDATE/DELETE des tables suivies. Consommé par /api/realtime via
-- LISTEN dans une connexion dédiée.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tati_notify_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  payload jsonb;
BEGIN
  payload := jsonb_build_object(
    'table', TG_TABLE_NAME,
    'event', TG_OP,
    'new',   CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    'old',   CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END
  );
  -- pg_notify limité à 8000 octets — tronque si payload trop gros.
  PERFORM pg_notify('tati_changes', left(payload::text, 7900));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['conversations','messages','llm_providers','mcp_servers','app_settings']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_notify ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER %I_notify AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.tati_notify_change()',
      t, t
    );
  END LOOP;
END$$;
