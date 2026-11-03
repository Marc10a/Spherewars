-- SphereWars: initial schema. Reproducible; run with `supabase db push`.
create extension if not exists pgcrypto;

create type locale_code as enum ('es','en','ca');
create type editorial_status as enum ('draft','pending_review','approved','published','archived');
create type user_role as enum ('admin','editor','reviewer');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  role user_role not null default 'editor',
  created_at timestamptz not null default now()
);

create table media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  kind text not null check (kind in ('faction','miniature','event','art','post','wiki')),
  alt_text jsonb not null default '{}',
  width int, height int, is_official boolean not null default true,
  created_at timestamptz not null default now()
);

create table factions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  theme text not null,
  hero_media uuid references media_assets,
  sort int not null default 0,
  status editorial_status not null default 'draft'
);
create table faction_translations (
  faction_id uuid references factions on delete cascade,
  locale locale_code not null,
  name text not null, blurb text, playstyle text, body jsonb,
  primary key (faction_id, locale)
);
create table subfactions (
  id uuid primary key default gen_random_uuid(),
  faction_id uuid not null references factions on delete cascade,
  slug text not null unique, name text not null, description text
);

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  faction_id uuid references factions, subfaction_id uuid references subfactions,
  category text not null check (category in ('leader','fighter','starter','accessory')),
  name text not null, description jsonb default '{}', contents text,
  price_cents int check (price_cents >= 0), currency char(3) default 'EUR',
  commercial_status text not null default 'announced',
  buy_url text, profile_url text,
  publish_at timestamptz,            -- embargo: hidden until this moment
  status editorial_status not null default 'draft'
);
create index on products (faction_id, status);
create table product_images (
  product_id uuid references products on delete cascade,
  media_id uuid references media_assets, sort int default 0,
  primary key (product_id, media_id)
);

create table article_categories (id uuid primary key default gen_random_uuid(), slug text unique not null, name jsonb not null);
create table articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null, locale locale_code not null,
  category_id uuid references article_categories,
  title text not null, body jsonb not null default '{}',
  status editorial_status not null default 'draft',
  author uuid references profiles, updated_at timestamptz not null default now(),
  unique (slug, locale)
);
create index on articles using gin (to_tsvector('spanish', title));
create table article_versions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles on delete cascade,
  body jsonb not null, edited_by uuid references profiles, created_at timestamptz default now()
);

create table locations (id uuid primary key default gen_random_uuid(), slug text unique not null, name text not null, geometry jsonb, article_id uuid references articles);
create table lore_events (id uuid primary key default gen_random_uuid(), title text not null, period text, sort int, article_id uuid references articles);
create table news (
  id uuid primary key default gen_random_uuid(), slug text unique not null, locale locale_code not null,
  category text not null check (category in ('minis','news','rules','wiki','events','community')),
  title text not null, body jsonb, publish_at timestamptz, status editorial_status not null default 'draft'
);
create table downloadable_resources (
  id uuid primary key default gen_random_uuid(), category text not null, name text not null,
  description text, version text, locale locale_code, file_type text, size_bytes bigint,
  storage_path text not null, updated_at timestamptz default now(), status editorial_status not null default 'draft'
);

create table stores (
  id uuid primary key default gen_random_uuid(), name text not null, address text, city text,
  website text, contact text, collaboration text, verified boolean not null default false
);
create table events (
  id uuid primary key default gen_random_uuid(), slug text unique not null,
  kind text not null check (kind in ('demo','tournament','special','community','fair')),
  title text not null, starts_at timestamptz not null, ends_at timestamptz,
  store_id uuid references stores, city text, address text, format text, requirements text,
  fee_cents int check (fee_cents >= 0), capacity int check (capacity > 0), registration_url text,
  status editorial_status not null default 'draft'
);
create index on events (starts_at) where status = 'published';
create table event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events on delete cascade,
  name text not null, email text not null, created_at timestamptz default now(),
  unique (event_id, email)
);
-- Capacity can never be exceeded, even under concurrent inserts.
create function enforce_event_capacity() returns trigger language plpgsql as $$
declare cap int; cnt int;
begin
  select capacity into cap from events where id = new.event_id for update;
  select count(*) into cnt from event_registrations where event_id = new.event_id;
  if cap is not null and cnt >= cap then raise exception 'event full'; end if;
  return new;
end $$;
create trigger trg_event_capacity before insert on event_registrations for each row execute function enforce_event_capacity();

create table community_gallery (
  id uuid primary key default gen_random_uuid(), media_id uuid references media_assets,
  author_name text, consent_given boolean not null default false,
  status editorial_status not null default 'pending_review',
  check (status <> 'published' or consent_given)
);
create table site_settings (key text primary key, value jsonb not null);
create table audit_log (id bigserial primary key, actor uuid, action text, entity text, entity_id text, at timestamptz default now());

-- Row level security: public reads published rows only; writes via role checks.
create function current_role_is(variadic r user_role[]) returns boolean language sql stable security definer as
$$ select exists (select 1 from profiles where id = auth.uid() and role = any(r)) $$;

do $$
declare t text;
begin
  foreach t in array array['factions','products','articles','news','downloadable_resources','events'] loop
    execute format('alter table %I enable row level security', t);
    execute format($p$create policy "public read published" on %I for select using (status = 'published')$p$, t);
    execute format($p$create policy "staff all" on %I for all using (current_role_is('admin','editor','reviewer')) with check (current_role_is('admin','editor'))$p$, t);
  end loop;
end $$;
alter table event_registrations enable row level security;
create policy "anyone can register" on event_registrations for insert with check (true);
create policy "staff read registrations" on event_registrations for select using (current_role_is('admin','editor'));
alter table community_gallery enable row level security;
create policy "public read approved" on community_gallery for select using (status = 'published' and consent_given);
create policy "staff gallery" on community_gallery for all using (current_role_is('admin','editor','reviewer'));
alter table profiles enable row level security;
create policy "own profile" on profiles for select using (id = auth.uid() or current_role_is('admin'));
