  create table "public"."order_items" (
    "id" uuid not null default gen_random_uuid(),
    "order_id" uuid,
    "product_id" uuid,
    "product_name" text not null,
    "category_name" text,
    "quantity" integer not null,
    "unit_price" integer not null,
    "subtotal" integer not null
      );


alter table "public"."order_items" enable row level security;


  create table "public"."orders" (
    "id" uuid not null default gen_random_uuid(),
    "order_code" text not null,
    "customer_name" text not null,
    "notes" text,
    "delivery_type" text not null,
    "payment_method" text not null,
    "delivery_cost" integer,
    "subtotal" integer not null,
    "total" integer not null,
    "status" text,
    "whatsapp_sent_at" timestamp with time zone,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."orders" enable row level security;

alter table "public"."categories" add column "is_available_for_delivery" boolean;

alter table "public"."products" add column "is_available_for_delivery" boolean;

CREATE UNIQUE INDEX order_items_pkey ON public.order_items USING btree (id);

CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id);

alter table "public"."order_items" add constraint "order_items_pkey" PRIMARY KEY using index "order_items_pkey";

alter table "public"."orders" add constraint "orders_pkey" PRIMARY KEY using index "orders_pkey";

alter table "public"."order_items" add constraint "order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE not valid;

alter table "public"."order_items" validate constraint "order_items_order_id_fkey";

alter table "public"."order_items" add constraint "order_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL not valid;

alter table "public"."order_items" validate constraint "order_items_product_id_fkey";

grant delete on table "public"."order_items" to "anon";

grant insert on table "public"."order_items" to "anon";

grant references on table "public"."order_items" to "anon";

grant select on table "public"."order_items" to "anon";

grant trigger on table "public"."order_items" to "anon";

grant truncate on table "public"."order_items" to "anon";

grant update on table "public"."order_items" to "anon";

grant delete on table "public"."order_items" to "authenticated";

grant insert on table "public"."order_items" to "authenticated";

grant references on table "public"."order_items" to "authenticated";

grant select on table "public"."order_items" to "authenticated";

grant trigger on table "public"."order_items" to "authenticated";

grant truncate on table "public"."order_items" to "authenticated";

grant update on table "public"."order_items" to "authenticated";

grant delete on table "public"."order_items" to "service_role";

grant insert on table "public"."order_items" to "service_role";

grant references on table "public"."order_items" to "service_role";

grant select on table "public"."order_items" to "service_role";

grant trigger on table "public"."order_items" to "service_role";

grant truncate on table "public"."order_items" to "service_role";

grant update on table "public"."order_items" to "service_role";

grant delete on table "public"."orders" to "anon";

grant insert on table "public"."orders" to "anon";

grant references on table "public"."orders" to "anon";

grant select on table "public"."orders" to "anon";

grant trigger on table "public"."orders" to "anon";

grant truncate on table "public"."orders" to "anon";

grant update on table "public"."orders" to "anon";

grant delete on table "public"."orders" to "authenticated";

grant insert on table "public"."orders" to "authenticated";

grant references on table "public"."orders" to "authenticated";

grant select on table "public"."orders" to "authenticated";

grant trigger on table "public"."orders" to "authenticated";

grant truncate on table "public"."orders" to "authenticated";

grant update on table "public"."orders" to "authenticated";

grant delete on table "public"."orders" to "service_role";

grant insert on table "public"."orders" to "service_role";

grant references on table "public"."orders" to "service_role";

grant select on table "public"."orders" to "service_role";

grant trigger on table "public"."orders" to "service_role";

grant truncate on table "public"."orders" to "service_role";

grant update on table "public"."orders" to "service_role";


  create policy "Permitir gestión de items a administradores"
  on "public"."order_items"
  as permissive
  for all
  to authenticated
using (true)
with check (true);
  create policy "Permitir insertar items a clientes"
  on "public"."order_items"
  as permissive
  for insert
  to public
with check (true);
  create policy "Permitir gestión total a administradores"
  on "public"."orders"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Permitir insertar pedidos a clientes"
  on "public"."orders"
  as permissive
  for insert
  to public
with check (true);
