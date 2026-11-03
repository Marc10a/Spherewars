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
