create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  category text not null check (char_length(trim(category)) > 0),
  price numeric(12, 2) not null check (price > 0),
  image text not null check (image ~* '^https?://'),
  description text not null check (char_length(trim(description)) > 0),
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

drop policy if exists "Anyone can view products" on public.products;
create policy "Anyone can view products"
  on public.products for select
  to anon, authenticated
  using (true);

drop policy if exists "Store admin can add products" on public.products;
create policy "Store admin can add products"
  on public.products for insert
  to authenticated
  with check ((select auth.jwt() ->> 'email') = 'REPLACE_WITH_ADMIN_EMAIL');

drop policy if exists "Store admin can update products" on public.products;
create policy "Store admin can update products"
  on public.products for update
  to authenticated
  using ((select auth.jwt() ->> 'email') = 'REPLACE_WITH_ADMIN_EMAIL')
  with check ((select auth.jwt() ->> 'email') = 'REPLACE_WITH_ADMIN_EMAIL');

drop policy if exists "Store admin can delete products" on public.products;
create policy "Store admin can delete products"
  on public.products for delete
  to authenticated
  using ((select auth.jwt() ->> 'email') = 'REPLACE_WITH_ADMIN_EMAIL');
