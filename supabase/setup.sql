-- SphereWars: Otro Mundo - configuracion COMPLETA de la base de datos (Supabase / PostgreSQL).
-- Pegar entero en Supabase > SQL Editor > New query > Run. Ejecutar UNA sola vez en un proyecto nuevo.
-- Equivale a las migraciones 0001 a 0006 (en supabase/migrations) en este orden.

-- ============================================================
-- 0001_init.sql
-- ============================================================
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


-- ============================================================
-- 0002_cms.sql
-- ============================================================
-- CMS: reviewer write access, DB-enforced editorial workflow, audit trail, storage, seed categories.

-- Product image (stored in the public "media" bucket).
alter table products add column image_path text, add column image_alt text;

-- Auto-create a profile (editor by default) for every new auth user. Promote manually to admin.
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Staff policies: reviewers may update (to approve); creation stays with admin/editor.
do $$
declare t text;
begin
  foreach t in array array['factions','products','articles','news','downloadable_resources','events'] loop
    execute format('drop policy "staff all" on %I', t);
    execute format($p$create policy "staff read" on %I for select using (current_role_is('admin','editor','reviewer'))$p$, t);
    execute format($p$create policy "staff insert" on %I for insert with check (current_role_is('admin','editor'))$p$, t);
    execute format($p$create policy "staff update" on %I for update using (current_role_is('admin','editor','reviewer')) with check (current_role_is('admin','editor','reviewer'))$p$, t);
    execute format($p$create policy "admin delete" on %I for delete using (current_role_is('admin'))$p$, t);
  end loop;
end $$;

-- Editorial workflow, enforced in the database (service-role calls with no auth.uid() are exempt):
--   editor   : draft <-> pending_review
--   reviewer : pending_review -> approved | draft
--   admin    : anything, including published / archived
create function enforce_status_transition() returns trigger language plpgsql security definer set search_path = public as $$
declare r user_role;
begin
  if auth.uid() is null then return new; end if;
  select role into r from profiles where id = auth.uid();
  if r = 'admin' then return new; end if;
  if tg_op = 'INSERT' then
    if new.status in ('draft','pending_review') then return new; end if;
    raise exception 'role % may not create rows as %', r, new.status using errcode = '42501';
  end if;
  if new.status is not distinct from old.status then return new; end if;
  if r = 'editor' and new.status in ('draft','pending_review') and old.status in ('draft','pending_review') then return new; end if;
  if r = 'reviewer' and old.status = 'pending_review' and new.status in ('approved','draft') then return new; end if;
  raise exception 'role % may not move status % -> %', r, old.status, new.status using errcode = '42501';
end $$;

-- Audit trail.
create function audit_change() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (actor, action, entity, entity_id)
  values (auth.uid(), tg_op, tg_table_name, coalesce(new.id, old.id)::text);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['factions','products','articles','news','downloadable_resources','events'] loop
    execute format('create trigger trg_status before insert or update on %I for each row execute function enforce_status_transition()', t);
    execute format('create trigger trg_audit after insert or update or delete on %I for each row execute function audit_change()', t);
  end loop;
end $$;
alter table audit_log enable row level security;
create policy "admin reads audit" on audit_log for select using (current_role_is('admin'));
alter table article_versions enable row level security;
create policy "staff versions" on article_versions for all using (current_role_is('admin','editor','reviewer')) with check (current_role_is('admin','editor'));
alter table article_categories enable row level security;
create policy "public read categories" on article_categories for select using (true);
create policy "admin categories" on article_categories for all using (current_role_is('admin')) with check (current_role_is('admin'));
alter table subfactions enable row level security;
create policy "public read subfactions" on subfactions for select using (true);
alter table media_assets enable row level security;
create policy "public read media" on media_assets for select using (true);
create policy "staff media" on media_assets for all using (current_role_is('admin','editor')) with check (current_role_is('admin','editor'));

-- Factions are structural: always readable so catalogue joins work; content status is per translation/body.
drop policy "public read published" on factions;
create policy "public read factions" on factions for select using (true);
alter table faction_translations enable row level security;
create policy "public read faction translations" on faction_translations for select using (true);

-- Storage: public bucket, staff-only writes.
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict do nothing;
create policy "public read media files" on storage.objects for select using (bucket_id = 'media');
create policy "staff upload media files" on storage.objects for insert with check (bucket_id = 'media' and current_role_is('admin','editor'));
create policy "staff update media files" on storage.objects for update using (bucket_id = 'media' and current_role_is('admin','editor'));

-- WikiSphere categories (structure only: names come from the project brief, no lore).
insert into article_categories (slug, name) values
 ('historia', '{"es":"Historia de Saphir"}'), ('divinidades', '{"es":"Divinidades"}'),
 ('leyes-divinas', '{"es":"Leyes divinas"}'), ('geografia', '{"es":"Geografía"}'),
 ('facciones', '{"es":"Facciones"}'), ('culturas', '{"es":"Culturas"}'),
 ('sociedades', '{"es":"Sociedades"}'), ('religiones', '{"es":"Religiones"}'),
 ('criaturas', '{"es":"Criaturas"}'), ('hebrado', '{"es":"Hebrado y Quinta Esencia"}'),
 ('cronologias', '{"es":"Cronologías"}'), ('personajes', '{"es":"Personajes relevantes"}')
on conflict do nothing;

-- Factions: seed the four official ones (names from the brief), unpublished until reviewed.
insert into factions (slug, theme, sort) values
 ('adeptos-de-malesur','malesur',1), ('alianza','alianza',2), ('manadas-de-urueh','urueh',3), ('vastagos-de-kurgan','kurgan',4)
on conflict do nothing;


-- ============================================================
-- 0003_events_downloads.sql
-- ============================================================
-- Events: fields missing from the first schema, plus a switch for built-in registration.
alter table events
  add column organizer text,
  add column description text,
  add column prizes text,
  add column registration_open boolean not null default false;

-- Public registration only for published events that opted in. Capacity is enforced by trg_event_capacity.
drop policy "anyone can register" on event_registrations;
create policy "register for open events" on event_registrations for insert
  with check (exists (select 1 from events e where e.id = event_id and e.status = 'published' and e.registration_open and e.starts_at > now()));

-- Public can see how many spots remain, never who registered.
create function event_registration_count(p_event uuid) returns int language sql stable security definer set search_path = public as
$$ select count(*)::int from event_registrations where event_id = p_event $$;
grant execute on function event_registration_count(uuid) to anon, authenticated;

-- Downloads: lookups and size/type sanity.
alter table downloadable_resources add constraint downloads_size_nonneg check (size_bytes is null or size_bytes >= 0);
create index on downloadable_resources (category, status);


-- ============================================================
-- 0004_shop.sql
-- ============================================================
-- Shop: sellable products, stock, orders, shipping settings. Also closes missing row level security (RLS).

-- 1. SECURITY FIX: these tables were created without RLS. In Supabase every public table is reachable with the
--    public anon key, so without RLS anyone could read AND write them. Enable RLS and add explicit policies.
alter table product_images enable row level security;
create policy "public read product images" on product_images for select using (true);
create policy "staff write product images" on product_images for all
  using (current_role_is('admin','editor')) with check (current_role_is('admin','editor'));

alter table locations enable row level security;
create policy "public read locations" on locations for select using (true);
create policy "staff write locations" on locations for all
  using (current_role_is('admin','editor')) with check (current_role_is('admin','editor'));

alter table lore_events enable row level security;
create policy "public read lore events" on lore_events for select using (true);
create policy "staff write lore events" on lore_events for all
  using (current_role_is('admin','editor')) with check (current_role_is('admin','editor'));

alter table stores enable row level security;
create policy "public read verified stores" on stores for select using (verified);
create policy "staff all stores" on stores for all
  using (current_role_is('admin','editor')) with check (current_role_is('admin','editor'));

alter table site_settings enable row level security;
create policy "public read shop settings" on site_settings for select using (key in ('shop'));
create policy "admin write settings" on site_settings for all
  using (current_role_is('admin')) with check (current_role_is('admin'));

-- 2. Sellable products. Prices are NEVER invented: a product can only be sold if the owner entered a price.
alter table products
  add column sku text unique,
  add column stock int check (stock >= 0),            -- null = unlimited / made to order
  add column sellable boolean not null default false,
  add constraint products_sellable_needs_price check (not sellable or (price_cents is not null and price_cents > 0));

-- 3. Orders. Created and updated only by the server (service role); staff can read and fulfil them. Customers never
--    query these tables directly.
create type order_status as enum ('pending','paid','shipped','cancelled','refunded');

create table orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  status order_status not null default 'pending',
  email text, customer_name text, phone text,
  shipping_address jsonb, shipping_country char(2),
  currency char(3) not null default 'EUR',
  subtotal_cents int not null check (subtotal_cents >= 0),
  shipping_cents int not null default 0 check (shipping_cents >= 0),
  total_cents int not null check (total_cents >= 0),
  stripe_session_id text unique, stripe_payment_intent text,
  locale locale_code not null default 'es',
  tracking text, notes text,
  created_at timestamptz not null default now(), paid_at timestamptz, shipped_at timestamptz
);
create index on orders (status, created_at desc);
create index on orders (stripe_payment_intent);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders on delete cascade,
  product_id uuid references products on delete set null,
  name text not null, sku text,
  unit_price_cents int not null check (unit_price_cents >= 0),
  qty int not null check (qty > 0)
);
create index on order_items (order_id);

alter table orders enable row level security;
alter table order_items enable row level security;
create policy "staff read orders" on orders for select using (current_role_is('admin','editor'));
create policy "staff update orders" on orders for update
  using (current_role_is('admin','editor')) with check (current_role_is('admin','editor'));
create policy "staff read order items" on order_items for select using (current_role_is('admin','editor'));
-- No insert/delete policies on purpose: only the server (service role) creates orders.

create trigger trg_audit_orders after insert or update or delete on orders for each row execute function audit_change();

-- 4. Payment confirmation, atomic and idempotent: marks a pending order paid and decrements stock exactly once.
create function mark_order_paid(
  p_session text, p_payment_intent text, p_email text, p_name text, p_phone text, p_address jsonb, p_country text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  update orders set status = 'paid', paid_at = now(), stripe_payment_intent = p_payment_intent,
         email = coalesce(p_email, email), customer_name = coalesce(p_name, customer_name), phone = coalesce(p_phone, phone),
         shipping_address = coalesce(p_address, shipping_address), shipping_country = coalesce(p_country, shipping_country)
   where stripe_session_id = p_session and status = 'pending'
   returning id into v_id;
  if v_id is null then return null; end if;          -- already processed (webhooks can be delivered more than once)
  update products p set stock = greatest(p.stock - oi.qty, 0)
    from order_items oi
   where oi.order_id = v_id and oi.product_id = p.id and p.stock is not null;
  return v_id;
end $$;
revoke all on function mark_order_paid(text, text, text, text, text, jsonb, text) from public, anon, authenticated;

-- Public order lookup for the "thank you" page, by the unguessable Stripe session id only.
create function order_by_session(p_session text) returns table (number bigint, status order_status, total_cents int, currency char(3))
language sql stable security definer set search_path = public as
$$ select number, status, total_cents, currency from orders where stripe_session_id = p_session $$;
grant execute on function order_by_session(text) to anon, authenticated;


-- ============================================================
-- 0005_product_wiki_link.sql
-- ============================================================
-- Links a sellable product to its miniature in the official wiki (slug of the character page, e.g. 'personajes/mandas-de-urueh/satanor').
-- The faction shop pages list every wiki miniature of the faction; a miniature gets a price and a Buy button only when a
-- published, sellable product points to it. Miniatures without a linked product show "coming soon" (no invented prices).
alter table products add column wiki_slug text;
create index on products (wiki_slug) where wiki_slug is not null;


-- ============================================================
-- 0006_contact.sql
-- ============================================================
-- Contact form messages. Written ONLY by the server (service role); staff read and triage them in the admin.
-- No public policy on purpose: visitors can never read or write this table directly.
create type contact_status as enum ('new','read','archived');

create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 100),
  email text not null check (char_length(email) <= 200),
  subject text not null,
  message text not null check (char_length(message) between 10 and 3000),
  locale locale_code not null default 'es',
  ip_hash text,                 -- SHA-256(ip + secret salt): lets us rate-limit without storing the IP itself
  status contact_status not null default 'new'
);
create index on contact_messages (ip_hash, created_at desc);
create index on contact_messages (status, created_at desc);

alter table contact_messages enable row level security;
create policy "staff read contact" on contact_messages for select using (current_role_is('admin','editor'));
create policy "staff update contact" on contact_messages for update
  using (current_role_is('admin','editor')) with check (current_role_is('admin','editor'));
create policy "admin delete contact" on contact_messages for delete using (current_role_is('admin'));

