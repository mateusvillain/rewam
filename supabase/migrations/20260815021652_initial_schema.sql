-- Schema inicial do Rewam.
--
-- O TMDB é fonte de catálogo, não fonte dos registros pessoais: `titles`,
-- `seasons` e `episodes` guardam uma cópia mínima do catálogo, enquanto
-- `watch_events` guarda o que a pessoa de fato assistiu.
--
-- Duas decisões estruturais valem destaque:
--   1. `watch_events.duration_minutes` congela a duração usada no momento do
--      registro, de modo que uma correção posterior no TMDB não reescreva o
--      histórico. Duração desconhecida é NULL — nunca zero — e fica fora dos totais.
--   2. Reassistida não é coluna: é derivada da ordem cronológica dos eventos do
--      mesmo alvo, o que mantém a numeração coerente quando eventos são
--      editados ou removidos.

create type public.media_type as enum ('movie', 'tv');

-- Mantém `updated_at` sincronizado sem depender do cliente.
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

comment on table public.profiles is 'Perfil pessoal; o id é sempre igual a auth.users.id.';

-- ---------------------------------------------------------------------------
-- titles
-- ---------------------------------------------------------------------------

create table public.titles (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer not null,
  media_type public.media_type not null,
  title text not null,
  original_title text,
  poster_path text,
  release_date date,
  runtime_minutes integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint titles_tmdb_id_media_type_key unique (tmdb_id, media_type),
  constraint titles_runtime_minutes_check check (runtime_minutes is null or runtime_minutes > 0)
);

create trigger titles_set_updated_at
before update on public.titles
for each row execute function public.set_updated_at();

comment on column public.titles.runtime_minutes is 'NULL quando o TMDB não informa duração. Nunca preencher com zero.';

-- ---------------------------------------------------------------------------
-- seasons
-- ---------------------------------------------------------------------------

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references public.titles (id) on delete cascade,
  tmdb_season_number integer not null,
  name text,
  episode_count integer,
  poster_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasons_title_id_tmdb_season_number_key unique (title_id, tmdb_season_number),
  -- Temporada 0 existe no TMDB (especiais), então o piso é zero, não um.
  constraint seasons_tmdb_season_number_check check (tmdb_season_number >= 0),
  constraint seasons_episode_count_check check (episode_count is null or episode_count >= 0)
);

create trigger seasons_set_updated_at
before update on public.seasons
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- episodes
-- ---------------------------------------------------------------------------

create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references public.titles (id) on delete cascade,
  season_id uuid references public.seasons (id) on delete set null,
  tmdb_episode_id integer,
  season_number integer not null,
  episode_number integer not null,
  name text,
  runtime_minutes integer,
  air_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint episodes_title_id_season_number_episode_number_key
    unique (title_id, season_number, episode_number),
  -- Permite que watch_events referencie o par (episode_id, title_id) e assim
  -- garanta, por chave estrangeira, que o episódio pertence ao título do evento.
  constraint episodes_id_title_id_key unique (id, title_id),
  constraint episodes_season_number_check check (season_number >= 0),
  constraint episodes_episode_number_check check (episode_number > 0),
  constraint episodes_runtime_minutes_check check (runtime_minutes is null or runtime_minutes > 0)
);

create trigger episodes_set_updated_at
before update on public.episodes
for each row execute function public.set_updated_at();

-- O índice de (title_id, season_number, episode_number) exigido pelo briefing já
-- vem da constraint UNIQUE acima; criar outro igual só duplicaria escrita.

comment on column public.episodes.runtime_minutes is 'Duração individual do episódio; NULL quando desconhecida.';

-- ---------------------------------------------------------------------------
-- watch_events
-- ---------------------------------------------------------------------------

create table public.watch_events (
  id uuid primary key default gen_random_uuid(),
  -- Nunca confiar em user_id vindo do cliente: o default vem da sessão.
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title_id uuid not null references public.titles (id) on delete cascade,
  episode_id uuid references public.episodes (id) on delete cascade,
  watched_at timestamptz not null default now(),
  duration_minutes integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint watch_events_duration_minutes_check
    check (duration_minutes is null or duration_minutes > 0),
  constraint watch_events_notes_length_check check (notes is null or char_length(notes) <= 500),
  -- Episódio informado precisa pertencer ao título do evento.
  constraint watch_events_episode_belongs_to_title
    foreign key (episode_id, title_id) references public.episodes (id, title_id) on delete cascade
);

create trigger watch_events_set_updated_at
before update on public.watch_events
for each row execute function public.set_updated_at();

create index watch_events_user_id_watched_at_idx
  on public.watch_events (user_id, watched_at desc);

create index watch_events_user_id_title_id_idx
  on public.watch_events (user_id, title_id);

-- Sustenta a numeração de exibição/reassistida por episódio.
create index watch_events_user_id_episode_id_idx
  on public.watch_events (user_id, episode_id)
  where episode_id is not null;

comment on table public.watch_events is 'Uma exibição. episode_id nulo representa filme ou registro agregado de série.';
comment on column public.watch_events.duration_minutes is 'Duração congelada no registro; NULL fica fora de todos os totais.';
