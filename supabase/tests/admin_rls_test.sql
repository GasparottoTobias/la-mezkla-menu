begin;
select plan(10);

insert into auth.users (id)
values
  ('00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000102');

insert into public.profiles (id, role)
values
  ('00000000-0000-0000-0000-000000000101', 'user'),
  ('00000000-0000-0000-0000-000000000102', 'admin');

insert into public.categories (id, name, order_index, is_active)
values ('10000000-0000-0000-0000-000000000001', 'QA', 1, true);

insert into public.products (id, name, price, category_id, order_index, is_active)
values (
  '20000000-0000-0000-0000-000000000001',
  'Producto QA',
  100,
  '10000000-0000-0000-0000-000000000001',
  1,
  true
);

select ok(
  (
    select bool_and(c.relrowsecurity)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('categories', 'products', 'orders', 'order_items', 'profiles')
  ),
  'RLS is enabled on every exposed table'
);

select ok(
  not has_table_privilege('anon', 'public.profiles', 'select')
    and not has_table_privilege('authenticated', 'public.profiles', 'insert,update,delete')
    and not has_table_privilege('anon', 'public.orders', 'select,update,delete')
    and has_table_privilege('anon', 'public.orders', 'insert'),
  'table grants follow least privilege'
);

set local role anon;

select ok(
  (select count(*) from public.categories) > 0
    and (select count(*) from public.products) > 0,
  'anonymous visitors can read the public menu'
);

select lives_ok(
  $$
    insert into public.orders (
      id,
      order_code,
      customer_name,
      delivery_type,
      payment_method,
      subtotal,
      total
    )
    values (
      '30000000-0000-0000-0000-000000000001',
      'QA01',
      'Cliente QA',
      'local',
      'efectivo',
      100,
      100
    )
  $$,
  'anonymous visitors can create an order'
);

select lives_ok(
  $$
    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      category_name,
      quantity,
      unit_price,
      subtotal
    )
    values (
      '30000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      'Producto QA',
      'QA',
      1,
      100,
      100
    )
  $$,
  'anonymous visitors can create order items'
);

reset role;
set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000101","role":"authenticated"}',
  true
);

select ok(
  (
    select count(*) = 1
      and bool_and(id = '00000000-0000-0000-0000-000000000101')
    from public.profiles
  ),
  'regular users can read only their own profile'
);

update public.products
set price = 200
where id = '20000000-0000-0000-0000-000000000001';

select ok(
  (
    select price = 100
    from public.products
    where id = '20000000-0000-0000-0000-000000000001'
  ),
  'regular users cannot update products'
);

select ok(
  (select count(*) from public.orders) = 0,
  'regular users cannot read orders'
);

reset role;
set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000102","role":"authenticated"}',
  true
);

update public.products
set price = 200
where id = '20000000-0000-0000-0000-000000000001';

select ok(
  (
    select price = 200
    from public.products
    where id = '20000000-0000-0000-0000-000000000001'
  ),
  'administrators can update products'
);

select ok(
  (select count(*) from public.orders) > 0,
  'administrators can read orders'
);

reset role;
select * from finish();
rollback;
