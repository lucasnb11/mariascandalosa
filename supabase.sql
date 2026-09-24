-- Execute em um projeto Supabase reservado à loja.
create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  reference_id text not null unique,
  request_id uuid not null unique,
  status_token_hash text not null unique,
  status text not null default 'CREATING',
  items jsonb not null,
  total_cents bigint not null check (total_cents > 0),
  delivery text not null check (delivery in ('pickup','delivery')),
  shipping_address jsonb,
  checkout_id text,
  pay_url text,
  payment_method text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Atualiza também uma instalação anterior sem apagar pedidos.
alter table public.store_orders add column if not exists shipping_address jsonb;

alter table public.store_orders enable row level security;
-- Nenhuma política de leitura pública: apenas a chave service_role no servidor.
create index if not exists store_orders_created_at_idx on public.store_orders(created_at desc);
