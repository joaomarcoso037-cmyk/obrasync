-- Mensalidade do ObraSync. Rode uma vez no SQL Editor da Supabase, depois do schema.sql.
-- Pode rodar de novo sem problema: nada é duplicado e nenhum dado é apagado.
--
-- Quem grava a situação da assinatura é só o servidor (funções `assinatura` e `asaas-webhook`).
-- O app só consegue ler a linha da própria conta.

-- Preços. Para mudar o valor, edite `valor_centavos` no Table Editor (9799 = R$ 97,99).
-- O novo valor vale para quem assinar depois; quem já assina continua no valor antigo.
create table if not exists public.planos (
  id text primary key check (id in ('mensal', 'anual')),
  nome text not null,
  valor_centavos integer not null check (valor_centavos > 0),
  ciclo text not null check (ciclo in ('MONTHLY', 'YEARLY')),
  ativo boolean not null default true
);

insert into public.planos (id, nome, valor_centavos, ciclo) values
  ('mensal', 'Mensal', 9799, 'MONTHLY'),
  ('anual', 'Anual', 95999, 'YEARLY')
on conflict (id) do nothing;

alter table public.planos enable row level security;
revoke all on public.planos from anon, authenticated;
grant select on public.planos to authenticated;
drop policy if exists "ver planos" on public.planos;
create policy "ver planos" on public.planos for select to authenticated using (ativo);

-- Uma linha por conta.
-- teste_ate: fim do teste grátis. pago_ate: até quando a última mensalidade paga cobre.
create table if not exists public.assinaturas (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plano text references public.planos (id),
  teste_ate timestamptz not null default now() + interval '3 days',
  pago_ate timestamptz,
  situacao text not null default 'teste' check (situacao in ('teste', 'ativa', 'atrasada', 'cancelada')),
  asaas_cliente text unique,
  asaas_assinatura text unique,
  link_pagamento text,
  atualizado_em timestamptz not null default now()
);

alter table public.assinaturas enable row level security;
revoke all on public.assinaturas from anon, authenticated;
grant select on public.assinaturas to authenticated;
drop policy if exists "ver a propria assinatura" on public.assinaturas;
create policy "ver a propria assinatura" on public.assinaturas
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Garante os 3 dias também onde a tabela já existia com outro prazo.
alter table public.assinaturas alter column teste_ate set default now() + interval '3 days';

-- Avisos do Asaas já tratados. O Asaas pode mandar o mesmo aviso mais de uma vez.
create table if not exists public.eventos_asaas (
  id text primary key,
  tipo text not null,
  recebido_em timestamptz not null default now(),
  dados jsonb not null
);
alter table public.eventos_asaas enable row level security;
revoke all on public.eventos_asaas from anon, authenticated;

-- Toda conta nova começa com 3 dias grátis.
create or replace function public.criar_assinatura_teste()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.assinaturas (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke execute on function public.criar_assinatura_teste() from public, anon, authenticated;

drop trigger if exists ao_criar_usuario_assinatura on auth.users;
create trigger ao_criar_usuario_assinatura
  after insert on auth.users
  for each row execute function public.criar_assinatura_teste();

-- Contas que já existiam ganham o teste a partir de agora.
insert into public.assinaturas (user_id) select id from auth.users on conflict (user_id) do nothing;

-- Regra de acesso: dentro do teste, ou até 7 dias depois do fim do período pago.
-- A mesma regra está no app, em src/lib/assinatura.ts.
create or replace function public.acesso_liberado()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.assinaturas a
    where a.user_id = (select auth.uid())
      and (a.teste_ate > now() or a.pago_ate + interval '7 days' > now())
  );
$$;
revoke execute on function public.acesso_liberado() from public, anon;
grant execute on function public.acesso_liberado() to authenticated;

-- Conta bloqueada não grava dados, mesmo que alguém contorne a tela de bloqueio do app.
drop policy if exists "criar os proprios dados" on public.espacos;
create policy "criar os proprios dados" on public.espacos
  for insert to authenticated
  with check ((select auth.uid()) = user_id and (select public.acesso_liberado()));

drop policy if exists "alterar os proprios dados" on public.espacos;
create policy "alterar os proprios dados" on public.espacos
  for update to authenticated
  using ((select auth.uid()) = user_id and (select public.acesso_liberado()))
  with check ((select auth.uid()) = user_id and (select public.acesso_liberado()));
