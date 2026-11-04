-- Reserves stock when checkout starts and releases it if the order is cancelled, the Stripe session expires or checkout dies midway.
-- Without this, two customers could pay for the last unit at the same time.
alter table orders
  add column stock_reserved boolean not null default false,
  add column reserved_until timestamptz,
  add column client_hash text;                         -- salted hash of the buyer's IP, to limit open reservations per client
create index on orders (reserved_until) where stock_reserved;
create index on orders (client_hash) where stock_reserved;
alter table order_items add column reserved_qty int not null default 0 check (reserved_qty >= 0);

-- All or nothing: returns false, changing nothing, if any line lacks stock. Products are locked in a fixed order to avoid deadlocks.
create function reserve_order_stock(p_order uuid) returns boolean language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select oi.product_id, sum(oi.qty)::int as qty from order_items oi
     where oi.order_id = p_order and oi.product_id is not null
     group by oi.product_id order by oi.product_id
  loop
    update products set stock = stock - r.qty where id = r.product_id and stock is not null and stock >= r.qty;
    if found then
      update order_items set reserved_qty = qty where order_id = p_order and product_id = r.product_id;
    elsif exists (select 1 from products where id = r.product_id and stock is not null) then
      raise exception 'out_of_stock';
    end if;
  end loop;
  update orders set stock_reserved = true, reserved_until = now() + interval '35 minutes' where id = p_order and status = 'pending';
  return true;
exception when raise_exception then
  return false;
end $$;

-- Cancels a pending order and gives back exactly what it reserved, once. Later stock edits in the panel are not undone.
create function release_order_stock(p_session text default null, p_order uuid default null) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_id uuid; r record;
begin
  select id into v_id from orders
   where status = 'pending' and ((p_session is not null and stripe_session_id = p_session) or (p_order is not null and id = p_order))
   for update;
  if v_id is null then return false; end if;
  update orders set status = 'cancelled', stock_reserved = false, reserved_until = null where id = v_id;
  for r in
    select product_id, sum(reserved_qty)::int as qty from order_items
     where order_id = v_id and product_id is not null and reserved_qty > 0
     group by product_id order by product_id
  loop
    update products set stock = stock + r.qty where id = r.product_id and stock is not null;
  end loop;
  update order_items set reserved_qty = 0 where order_id = v_id;
  return true;
end $$;

-- Payment confirmation: stock was already taken at checkout. Orders created before this migration still decrement here.
create or replace function mark_order_paid(
  p_session text, p_payment_intent text, p_email text, p_name text, p_phone text, p_address jsonb, p_country text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_reserved boolean;
begin
  select id, stock_reserved into v_id, v_reserved from orders where stripe_session_id = p_session and status = 'pending' for update;
  if v_id is null then return null; end if;          -- already processed (webhooks can be delivered more than once)
  update orders set status = 'paid', paid_at = now(), stripe_payment_intent = p_payment_intent, stock_reserved = false, reserved_until = null,
         email = coalesce(p_email, email), customer_name = coalesce(p_name, customer_name), phone = coalesce(p_phone, phone),
         shipping_address = coalesce(p_address, shipping_address), shipping_country = coalesce(p_country, shipping_country)
   where id = v_id;
  if v_reserved then
    update order_items set reserved_qty = 0 where order_id = v_id;
  else
    update products p set stock = greatest(p.stock - oi.qty, 0)
      from order_items oi
     where oi.order_id = v_id and oi.product_id = p.id and p.stock is not null;
  end if;
  return v_id;
end $$;

revoke all on function reserve_order_stock(uuid) from public, anon, authenticated;
revoke all on function release_order_stock(text, uuid) from public, anon, authenticated;
grant execute on function reserve_order_stock(uuid) to service_role;
grant execute on function release_order_stock(text, uuid) to service_role;
