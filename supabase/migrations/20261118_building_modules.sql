-- Building information module for the House-Museum of I. S. Turgenev.
-- Run after the existing base schema, multi-assignee migration and role_profiles migration.
-- Adds separately managed building condition / defect register and design measurements / documents.
begin;

create table if not exists public.building_systems (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Инженерные системы',
  status text not null default 'unknown' check (status in ('unknown','good','watch','repair','critical')),
  location text not null default '',
  details text not null default '',
  last_inspected date,
  inspected_by text not null default '',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.building_issues (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'Другое',
  location text not null default '',
  severity text not null default 'Medium' check (severity in ('Low','Medium','High')),
  status text not null default 'Open' check (status in ('Open','In Progress','Resolved')),
  description text not null default '',
  resolution text not null default '',
  reported_at timestamptz not null default now(),
  due_date date,
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.building_measurements (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  value text not null default '',
  unit text not null default '',
  source text not null default '',
  status text not null default 'placeholder' check (status in ('documented','measured','placeholder')),
  notes text not null default '',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.building_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  document_type text not null default 'Документ',
  level text not null default '',
  file_url text not null default '',
  status text not null default 'reference' check (status in ('reference','draft','approved')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create or replace function public.pcc_has_any_role(allowed_roles text[])
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles p where p.user_id=auth.uid() and p.role=any(allowed_roles)); $$;
revoke all on function public.pcc_has_any_role(text[]) from public;
grant execute on function public.pcc_has_any_role(text[]) to anon, authenticated;

alter table public.building_systems enable row level security;
alter table public.building_issues enable row level security;
alter table public.building_measurements enable row level security;
alter table public.building_documents enable row level security;

drop policy if exists "public read building systems" on public.building_systems;
drop policy if exists "maintenance owner read building systems" on public.building_systems;
create policy "maintenance owner read building systems" on public.building_systems for select to authenticated
  using (public.pcc_has_any_role(array['admin','owner','maintenance']));
drop policy if exists "maintenance owner manage building systems" on public.building_systems;
create policy "maintenance owner manage building systems" on public.building_systems for all to authenticated
  using (public.pcc_has_any_role(array['admin','owner','maintenance']))
  with check (public.pcc_has_any_role(array['admin','owner','maintenance']));

drop policy if exists "public read building issues" on public.building_issues;
drop policy if exists "maintenance owner read building issues" on public.building_issues;
create policy "maintenance owner read building issues" on public.building_issues for select to authenticated
  using (public.pcc_has_any_role(array['admin','owner','maintenance']));
drop policy if exists "maintenance owner manage building issues" on public.building_issues;
create policy "maintenance owner manage building issues" on public.building_issues for all to authenticated
  using (public.pcc_has_any_role(array['admin','owner','maintenance']))
  with check (public.pcc_has_any_role(array['admin','owner','maintenance']));

drop policy if exists "public read building measurements" on public.building_measurements;
drop policy if exists "design owner read building measurements" on public.building_measurements;
create policy "design owner read building measurements" on public.building_measurements for select to authenticated
  using (public.pcc_has_any_role(array['admin','owner','design']));
drop policy if exists "design owner manage building measurements" on public.building_measurements;
create policy "design owner manage building measurements" on public.building_measurements for all to authenticated
  using (public.pcc_has_any_role(array['admin','owner','design']))
  with check (public.pcc_has_any_role(array['admin','owner','design']));

drop policy if exists "public read building documents" on public.building_documents;
drop policy if exists "design owner read building documents" on public.building_documents;
create policy "design owner read building documents" on public.building_documents for select to authenticated
  using (public.pcc_has_any_role(array['admin','owner','design']));
drop policy if exists "design owner manage building documents" on public.building_documents;
create policy "design owner manage building documents" on public.building_documents for all to authenticated
  using (public.pcc_has_any_role(array['admin','owner','design']))
  with check (public.pcc_has_any_role(array['admin','owner','design']));

-- Seed condition entries as UNINSPECTED, not as claims about today's condition.
insert into public.building_systems(name,category,status,details,sort_order)
select v.name,v.category,'unknown',v.details,v.sort_order
from (values
 ('Фасад','Внешние конструкции','Текущее состояние не зафиксировано в системе. Требуется актуальный визуальный осмотр.',1),
 ('Фундамент','Несущие конструкции','В историческом акте обследования 2016–2017 гг. отмечались аварийные участки и вымывание раствора. Текущий статус не установлен; требуется новое обследование.',2),
 ('Портик и колонны','Несущие конструкции','В акте 2016–2017 гг. отмечались аварийные участки конструкций портика. Это историческая запись, а не текущий диагноз.',3),
 ('Кровля и водосток','Внешние конструкции','Нужны актуальная фотофиксация, осмотр примыканий и проверка водоотведения.',4),
 ('Деревянные стены и обшивка','Несущие конструкции','Требуется проверка состояния древесины, защитного покрытия и узлов.',5),
 ('Электроснабжение','Инженерные системы','Актуальные акты измерений и обслуживания не внесены.',6),
 ('Отопление','Инженерные системы','Актуальные акты обслуживания и работоспособности не внесены.',7),
 ('Водоснабжение и канализация','Инженерные системы','Актуальные данные о состоянии инженерных сетей не внесены.',8),
 ('Вентиляция','Инженерные системы','Требуется проверка оборудования и воздухообмена.',9),
 ('Пожарная безопасность','Пожарная безопасность','Требуется загрузить актуальные акты проверки систем и журнал обслуживания.',10),
 ('Подвал и гидроизоляция','Внутренние помещения','Требуется актуальный осмотр влажностного режима и состояния подземной части.',11)
) as v(name,category,details,sort_order)
where not exists(select 1 from public.building_systems s where s.name=v.name);

insert into public.building_measurements(label,value,unit,source,status,notes,sort_order)
select v.label,v.value,v.unit,v.source,v.status,v.notes,v.sort_order
from (values
 ('Габарит основного объёма по плану','22,0 × 19,0','м','Акт ГИКЭ от 05.04.2017, стр. 20','documented','Габариты прямоугольного основного объёма; не площадь участка.',1),
 ('Высота помещений парадной анфилады','4,3–5,0','м','Акт ГИКЭ от 05.04.2017, стр. 21','documented','Зависит от пропорций помещений.',2),
 ('Колонны главного портика','6','шт.','Описание предмета охраны / акт ГИКЭ','documented','Шестиколонный портик с ионическими капителями.',3),
 ('Уровни здания','1 этаж + подвал + антресоль','описание','Акт ГИКЭ от 05.04.2017, стр. 20','documented','Подвал и антресоль устроены не под всей проекцией здания.',4),
 ('Общая площадь здания','','м²','Не найден подтверждённый показатель','placeholder','Заполнить по актуальной экспликации или техническому паспорту.',5),
 ('Высота конька кровли','','м','Требуется натурный обмер / чертёж','placeholder','Не подменять визуальной оценкой.',6),
 ('Толщина наружных стен','','мм','Требуется обследование','placeholder','Уточнить материал и конструкцию по участкам.',7),
 ('Размеры оконных и дверных проёмов','','мм','Требуется обмер фасадов','placeholder','Заполнить отдельными ведомостями по фасадам.',8),
 ('Размеры помещений / экспликация','','—','Требуется поэтажный обмерный план','placeholder','В открытых источниках не найден полный актуальный обмерный комплект.',9)
) as v(label,value,unit,source,status,notes,sort_order)
where not exists(select 1 from public.building_measurements m where m.label=v.label);

-- Enable Realtime publication for live updates where available.
do $$ begin
  alter publication supabase_realtime add table public.building_systems;
exception when duplicate_object then null; when undefined_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.building_issues;
exception when duplicate_object then null; when undefined_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.building_measurements;
exception when duplicate_object then null; when undefined_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.building_documents;
exception when duplicate_object then null; when undefined_object then null;
end $$;

commit;
