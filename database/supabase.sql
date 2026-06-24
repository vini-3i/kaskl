-- Kaskl Vendas - Supabase SQL completo, idempotente e atualizado
-- Execute no SQL Editor do Supabase. Não apaga seus produtos existentes.

create extension if not exists "pgcrypto";

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  name text not null default 'Administrador',
  role text not null default 'admin',
  active boolean not null default true,
  must_change_password boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_users add column if not exists name text not null default 'Administrador';
alter table public.admin_users add column if not exists role text not null default 'admin';
alter table public.admin_users add column if not exists active boolean not null default true;
alter table public.admin_users add column if not exists must_change_password boolean not null default true;
alter table public.admin_users add column if not exists last_login_at timestamptz;
alter table public.admin_users add column if not exists created_at timestamptz not null default now();
alter table public.admin_users add column if not exists updated_at timestamptz not null default now();

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category text not null,
  short_description text not null,
  description text not null,
  image_url text,
  old_price numeric(10,2),
  price numeric(10,2),
  checkout_url text not null,
  active boolean not null default true,
  featured boolean not null default false,
  badge text,
  scheduled_at timestamptz,
  views integer not null default 0,
  clicks integer not null default 0,
  checkout_clicks integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists featured boolean not null default false;
alter table public.products add column if not exists badge text;
alter table public.products add column if not exists scheduled_at timestamptz;
alter table public.products add column if not exists views integer not null default 0;
alter table public.products add column if not exists clicks integer not null default 0;
alter table public.products add column if not exists checkout_clicks integer not null default 0;
alter table public.products add column if not exists updated_at timestamptz not null default now();
-- Campos flexíveis para cadastro rápido: preço pode ficar vazio.
alter table public.products alter column price drop not null;
-- Descrição curta/completa continuam preenchidas automaticamente pelo backend quando vazias.


create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  event_type text not null,
  visitor_hash text not null,
  utm_source text not null default 'direto',
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.product_events add column if not exists utm_source text not null default 'direto';

create table if not exists public.changelog (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'update',
  title text not null,
  description text not null,
  product_id uuid references public.products(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_login_audit (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.admin_users(id) on delete set null,
  ip text,
  user_agent text,
  success boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.admin_users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.app_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null default 'info',
  message text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'info',
  title text not null,
  message text not null,
  read boolean not null default false,
  product_id uuid references public.products(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.app_settings(key, value) values
('product_form', '{"required_fields":["name","category","checkout_url"],"optional_fields":["slug","image_url","old_price","price","short_description","description","badge","scheduled_at","featured"],"mode":"flexible"}'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

-- Índices e deduplicação de views únicas.
delete from public.product_events a
using public.product_events b
where a.event_type = 'view'
  and b.event_type = 'view'
  and a.product_id = b.product_id
  and a.visitor_hash = b.visitor_hash
  and a.created_at > b.created_at;

create unique index if not exists uq_product_unique_view
on public.product_events(product_id, visitor_hash)
where event_type = 'view';

create index if not exists idx_product_events_product on public.product_events(product_id);
create index if not exists idx_product_events_type on public.product_events(event_type);
create index if not exists idx_product_events_utm on public.product_events(utm_source);
create index if not exists idx_product_events_created_at on public.product_events(created_at desc);
create index if not exists idx_products_active on public.products(active);
create index if not exists idx_products_featured on public.products(featured);
create index if not exists idx_products_slug on public.products(slug);
create index if not exists idx_products_scheduled_at on public.products(scheduled_at);
create index if not exists idx_products_created_at on public.products(created_at desc);
create index if not exists idx_admin_users_email on public.admin_users(email);
create index if not exists idx_notifications_read on public.notifications(read);
create index if not exists idx_audit_created on public.admin_audit_logs(created_at desc);
create index if not exists idx_logs_created on public.app_logs(created_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists trg_admin_users_updated_at on public.admin_users;
create trigger trg_admin_users_updated_at
before update on public.admin_users
for each row execute function public.set_updated_at();

create or replace function public.notify_product_change()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications(type,title,message,product_id)
    values ('product','Novo produto cadastrado',new.name || ' foi adicionado ao catálogo.',new.id);
  elsif tg_op = 'UPDATE' then
    insert into public.notifications(type,title,message,product_id)
    values ('update','Produto atualizado',new.name || ' recebeu alterações.',new.id);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_notify_product_change on public.products;
create trigger trg_notify_product_change
after insert or update on public.products
for each row execute function public.notify_product_change();

-- Registra visualização única por visitante/produto, com UTM.
create or replace function public.record_product_view(
  p_product_id uuid,
  p_visitor_hash text,
  p_ip text default null,
  p_user_agent text default null,
  p_utm_source text default 'direto'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count int;
begin
  insert into public.product_events(product_id, event_type, visitor_hash, ip, user_agent, utm_source)
  values (p_product_id, 'view', p_visitor_hash, p_ip, p_user_agent, coalesce(nullif(p_utm_source,''),'direto'))
  on conflict do nothing;

  get diagnostics inserted_count = row_count;

  if inserted_count > 0 then
    update public.products set views = coalesce(views,0) + 1 where id = p_product_id;
    return true;
  end if;

  return false;
end;
$$;

-- Registra clique de checkout, com UTM.
create or replace function public.record_product_checkout_click(
  p_product_id uuid,
  p_visitor_hash text,
  p_ip text default null,
  p_user_agent text default null,
  p_utm_source text default 'direto'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.product_events(product_id, event_type, visitor_hash, ip, user_agent, utm_source)
  values (p_product_id, 'checkout_click', p_visitor_hash, p_ip, p_user_agent, coalesce(nullif(p_utm_source,''),'direto'));

  update public.products
  set clicks = coalesce(clicks,0) + 1,
      checkout_clicks = coalesce(checkout_clicks,0) + 1
  where id = p_product_id;

  return true;
end;
$$;

create or replace function public.resync_product_metrics()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products p
  set
    views = coalesce((select count(*)::int from public.product_events e where e.product_id = p.id and e.event_type = 'view'),0),
    checkout_clicks = coalesce((select count(*)::int from public.product_events e where e.product_id = p.id and e.event_type = 'checkout_click'),0),
    clicks = coalesce((select count(*)::int from public.product_events e where e.product_id = p.id and e.event_type in ('checkout_click','product_click')),0);
end;
$$;

-- RLS. A API usa service role no backend; público só lê catálogo ativo e changelog.
alter table public.products enable row level security;
alter table public.changelog enable row level security;
alter table public.product_events enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_login_audit enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.app_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "Produtos ativos podem ser lidos publicamente" on public.products;
create policy "Produtos ativos podem ser lidos publicamente"
on public.products for select
using (active = true and (scheduled_at is null or scheduled_at <= now()));

drop policy if exists "Changelog pode ser lido publicamente" on public.changelog;
create policy "Changelog pode ser lido publicamente"
on public.changelog for select using (true);

drop policy if exists "Configuracoes publicas podem ser lidas" on public.app_settings;
create policy "Configuracoes publicas podem ser lidas"
on public.app_settings for select using (key = 'pixels');

-- Admin inicial. Senha: Admin@123456789
-- O sistema força troca de senha no primeiro login.
insert into public.admin_users (email, password_hash, name, role, active, must_change_password)
values (
  'jorge_costa@contabilidadelibra.com.br',
  '$2b$12$W0h./IotWv0aB8xgKuY.LOvxGu4DuFENWvWv44AJbwSZP.0agVqmS',
  'Jorge Costa',
  'admin',
  true,
  true
)
on conflict (email) do update set
  password_hash = excluded.password_hash,
  name = excluded.name,
  role = excluded.role,
  active = true,
  must_change_password = true,
  updated_at = now();

insert into public.app_settings(key,value)
values ('pixels', '{"meta_pixel":"","google_tag_manager":"","google_analytics":"","tiktok_pixel":""}'::jsonb)
on conflict (key) do nothing;

insert into public.changelog(type,title,description)
values
('maintenance','Cadastro flexível liberado','Agora é possível publicar produtos preenchendo apenas nome, categoria e link de checkout. Preço, descrições, imagem, badge e agendamento são opcionais.'), ('maintenance','Mega atualização Kaskl','Foram adicionados auditoria, notificações, exportação, pixel manager, UTM tracking, agendamento, score de produto e cadastro inteligente.')
on conflict do nothing;
