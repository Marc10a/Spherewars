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
