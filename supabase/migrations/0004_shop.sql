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
