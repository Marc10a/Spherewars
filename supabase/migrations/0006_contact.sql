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
