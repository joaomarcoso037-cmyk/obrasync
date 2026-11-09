-- Rode uma vez no SQL Editor da Supabase.
-- Cada conta tem uma linha com os próprios dados; a segurança é garantida no banco, pelas regras abaixo.

create table if not exists public.espacos (
  user_id uuid primary key references auth.users (id) on delete cascade,
  dados jsonb not null,
  versao bigint not null default 1,
  atualizado_em timestamptz not null default now()
);

alter table public.espacos enable row level security;

-- A Supabase dá todas as permissões por padrão; aqui ficam só as que o app usa.
revoke all on public.espacos from anon, authenticated;
grant select, insert, update on public.espacos to authenticated;

create policy "ler os proprios dados" on public.espacos
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "criar os proprios dados" on public.espacos
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "alterar os proprios dados" on public.espacos
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
