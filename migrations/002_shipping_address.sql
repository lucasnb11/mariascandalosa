-- Execute uma vez no SQL Editor do Supabase se a versão anterior já está instalada.
-- Seguro para executar novamente. Não apaga nem altera pedidos existentes.
alter table public.store_orders add column if not exists shipping_address jsonb;
