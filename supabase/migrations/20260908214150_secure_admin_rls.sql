-- Keep the public API surface explicit and protected by RLS.
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.profiles enable row level security;

revoke all privileges on table public.categories from anon, authenticated;
grant select on table public.categories to anon, authenticated;
grant insert, update, delete on table public.categories to authenticated;

revoke all privileges on table public.products from anon, authenticated;
grant select on table public.products to anon, authenticated;
grant insert, update, delete on table public.products to authenticated;

revoke all privileges on table public.orders from anon, authenticated;
grant insert on table public.orders to anon;
grant select, insert, update, delete on table public.orders to authenticated;

revoke all privileges on table public.order_items from anon, authenticated;
grant insert on table public.order_items to anon;
grant select, insert, update, delete on table public.order_items to authenticated;

revoke all privileges on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

drop policy if exists "Public read profiles" on public.profiles;
drop policy if exists "Users read own profile" on public.profiles;

create policy "Users read own profile"
on public.profiles
as permissive
for select
to authenticated
using ((select auth.uid()) = id);

-- All administrative access is authorized by the caller's own profile.
drop policy if exists "Admin write categories" on public.categories;

create policy "Admin write categories"
on public.categories
as permissive
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
);

drop policy if exists "Admin write products" on public.products;

create policy "Admin write products"
on public.products
as permissive
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
);

drop policy if exists "Permitir gestión total a administradores" on public.orders;

create policy "Permitir gestión total a administradores"
on public.orders
as permissive
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
);

drop policy if exists "Permitir gestión de items a administradores" on public.order_items;

create policy "Permitir gestión de items a administradores"
on public.order_items
as permissive
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.role = 'admin'
  )
);

-- Foreign keys are not indexed automatically in Postgres.
create index if not exists order_items_order_id_idx
on public.order_items (order_id);

create index if not exists order_items_product_id_idx
on public.order_items (product_id);
