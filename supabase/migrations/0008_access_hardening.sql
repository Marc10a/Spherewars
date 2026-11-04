-- 1. A new sign-up gets NO staff role: until now anyone able to register became "editor" and could read customers and change prices.
--    Staff are promoted explicitly: update profiles set role = 'admin' where id = '<uuid>';
alter table profiles alter column role drop default, alter column role drop not null;

-- 2. Role checks with a fixed search_path.
create or replace function current_role_is(variadic r user_role[]) returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = any(r)) $$;

-- 3. Staff manage shipping only: amounts, customer data and "paid" can only be set by the server (service role).
revoke update on orders from authenticated;
grant update (status, tracking, notes, shipped_at) on orders to authenticated;
create function enforce_order_status_by_staff() returns trigger language plpgsql as $$
begin
  if current_user = 'authenticated' and new.status is distinct from old.status
     and not ((old.status = 'paid' and new.status = 'shipped') or (old.status = 'shipped' and new.status = 'paid')) then
    raise exception 'Solo el servidor puede cambiar este estado de pedido';
  end if;
  return new;
end $$;
create trigger trg_order_status_by_staff before update on orders for each row execute function enforce_order_status_by_staff();

-- 4. Embargoed products stay hidden from anonymous API reads too.
drop policy "public read published" on products;
create policy "public read published" on products for select using (status = 'published' and (publish_at is null or publish_at <= now()));
