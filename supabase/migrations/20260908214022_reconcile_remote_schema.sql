-- These objects were created in production before they were versioned.
-- Preserve existing tables/data; also support a fresh local database.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null,
  customer_name text not null,
  notes text,
  delivery_type text not null,
  payment_method text not null,
  delivery_cost integer,
  subtotal integer not null,
  total integer not null,
  status text,
  whatsapp_sent_at timestamp with time zone,
  created_at timestamp with time zone default now()
);
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  category_name text,
  quantity integer not null,
  unit_price integer not null,
  subtotal integer not null
);
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.categories add column if not exists is_available_for_delivery boolean;
alter table public.products add column if not exists is_available_for_delivery boolean;
grant all on public.orders, public.order_items to service_role;

-- The next migration installs restricted admin policies and explicit grants.
-- Never broaden an existing policy while reconciling the schema.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public'
    and tablename = 'orders' and policyname = 'Permitir insertar pedidos a clientes') then
    create policy "Permitir insertar pedidos a clientes"
      on public.orders for insert to public with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public'
    and tablename = 'order_items' and policyname = 'Permitir insertar items a clientes') then
    create policy "Permitir insertar items a clientes"
      on public.order_items for insert to public with check (true);
  end if;
end;
$$;
