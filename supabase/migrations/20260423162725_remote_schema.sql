drop extension if exists "pg_net";

drop policy "Public read categories" on "public"."categories";

drop policy "Public read active products" on "public"."products";

revoke delete on table "public"."profiles" from "anon";

revoke insert on table "public"."profiles" from "anon";

revoke references on table "public"."profiles" from "anon";

revoke trigger on table "public"."profiles" from "anon";

revoke truncate on table "public"."profiles" from "anon";

revoke update on table "public"."profiles" from "anon";


  create policy "Public read categories"
  on "public"."categories"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Public read active products"
  on "public"."products"
  as permissive
  for select
  to anon, authenticated
using ((is_active = true));



