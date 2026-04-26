create table orders (
  id          uuid primary key default gen_random_uuid(),
  order_code  text not null,              -- ej: "B8FA" (el # del pedido)
  customer_name text not null,
  address     text,
  delivery_type text not null,            -- 'domicilio' | 'local'
  payment_method text not null,
  delivery_cost int4 default 0,
  subtotal    int4 not null,
  total       int4 not null,
  status      text default 'pending',     -- 'pending' | 'completed' | 'cancelled'
  whatsapp_sent_at timestamptz,           -- cuando se generó el link de WA
  created_at  timestamptz default now()
);

create table order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  product_name text not null,             -- snapshot por si el producto cambia
  category_name text,
  quantity   int4 not null,
  unit_price int4 not null,
  subtotal   int4 not null
);