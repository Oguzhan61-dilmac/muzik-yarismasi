-- =============================================================================
-- Online Müzik Yarışması — Supabase veritabanı şeması
--
-- Kurulum: Supabase → SQL Editor → New query → bu dosyanın tamamını yapıştır → Run.
-- ÇALIŞTIRMADAN ÖNCE: aşağıdaki "YÖNETİCİ" bölümündeki ornek@gmail.com adresini
-- kendi Google adresinle değiştir. O adresle ilk giriş yaptığında yönetici olursun.
--
-- Dosya tekrar çalıştırılabilir; mevcut verileri silmez. Güncelleme gelince
-- yeni sürümü aynı şekilde yapıştırıp çalıştırman yeterli.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Türler
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('user', 'jury', 'admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'contest_phase') then
    create type public.contest_phase as enum ('upcoming', 'submissions', 'review', 'voting', 'results');
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Tablolar
-- ----------------------------------------------------------------------------

-- Profiller: Google ile ilk girişte otomatik oluşur
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text,
  avatar_url text,
  role       public.app_role not null default 'user',
  created_at timestamptz not null default now()
);
create index if not exists profiles_email_idx on public.profiles (lower(email));

-- Ekip davetleri: e-postası burada olan kişi ilk girişinde bu rolü alır
create table if not exists public.role_invites (
  email      text primary key check (email = lower(email)),
  role       public.app_role not null check (role <> 'user'),
  created_at timestamptz not null default now()
);

-- Yarışma ayarları (tek satır)
create table if not exists public.settings (
  id                   int primary key default 1 check (id = 1),
  title                text not null default 'Online Müzik Yarışması' check (char_length(title) between 1 and 80),
  tagline              text not null default 'Şarkını gönder, finale kal, oyları topla.' check (char_length(tagline) <= 140),
  description          text not null default
    'Kendi bestelediğin ya da grubunla kaydettiğin bir şarkıyı, kapak görseliyle birlikte gönder. '
    'Jüri tüm başvuruları dinleyip puanlar ve finalistleri seçer; kazananı finalistler arasından herkesin oyu belirler.'
    check (char_length(description) <= 2000),
  rules                text not null default
    'Gönderilen şarkı sana ya da grubuna ait olmalı; başkasının eserini gönderemezsin.' || chr(10) ||
    'Her katılımcı en fazla 1 şarkıyla katılabilir.' || chr(10) ||
    'Şarkı MP3 ya da M4A biçiminde, en fazla 10 MB olmalı. Kapak görseli kare olmalı.' || chr(10) ||
    'Nefret söylemi, hakaret ve müstehcenlik içeren başvurular yarışma dışı bırakılır.' || chr(10) ||
    'Jüri şarkıları isimleri görmeden puanlar; finalistleri jüri puanlarına göre yarışma ekibi belirler.' || chr(10) ||
    'Kazananı finalistler arasından halk oylaması belirler. Her Google hesabı bir oy kullanabilir; oylama bitene kadar oyunu değiştirebilirsin.'
    check (char_length(rules) <= 6000),
  phase                public.contest_phase not null default 'submissions',
  submission_deadline  timestamptz,
  voting_ends_at       timestamptz,
  max_entries_per_user int not null default 1 check (max_entries_per_user between 1 and 10),
  updated_at           timestamptz not null default now()
);
alter table public.settings add column if not exists blind_judging boolean not null default true;
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- Başvurular
create table if not exists public.entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 80),
  artist_name text not null check (char_length(artist_name) between 1 and 60),
  genre       text check (char_length(genre) <= 40),
  description text check (char_length(description) <= 600),
  audio_path  text not null,
  cover_path  text not null,
  status      text not null default 'submitted' check (status in ('submitted', 'finalist', 'disqualified')),
  created_at  timestamptz not null default now()
);
create index if not exists entries_user_id_idx on public.entries (user_id);
create index if not exists entries_status_idx on public.entries (status);

-- Oylar: kişi başı tek oy (oylama bitene kadar değiştirilebilir)
create table if not exists public.votes (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  entry_id   uuid not null references public.entries (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists votes_entry_id_idx on public.votes (entry_id);

-- Jüri değerlendirme kriterleri
create table if not exists public.criteria (
  id          bigint generated always as identity primary key,
  name        text not null check (char_length(name) between 1 and 60),
  description text check (char_length(description) <= 300),
  weight      numeric(4, 2) not null default 1 check (weight > 0 and weight <= 10),
  sort_order  int not null default 0
);
insert into public.criteria (name, description, weight, sort_order)
select * from (values
  ('Özgünlük', 'Şarkının ne kadar özgün ve akılda kalıcı olduğu.', 1.0, 1),
  ('Prodüksiyon', 'Kayıt, miks ve genel ses kalitesi.', 1.0, 2),
  ('İcra', 'Vokal ya da enstrüman performansı.', 1.0, 3),
  ('Söz ve kompozisyon', 'Sözlerin, melodinin ve şarkı yapısının gücü.', 1.0, 4),
  ('Kapak görseli', 'Kapağın şarkıyla uyumu ve görsel etkisi.', 0.5, 5)
) as seed(name, description, weight, sort_order)
where not exists (select 1 from public.criteria);

-- Jüri puanları (1–10) ve notları
create table if not exists public.scores (
  entry_id     uuid not null references public.entries (id) on delete cascade,
  judge_id     uuid not null references public.profiles (id) on delete cascade,
  criterion_id bigint not null references public.criteria (id) on delete cascade,
  score        smallint not null check (score between 1 and 10),
  updated_at   timestamptz not null default now(),
  primary key (entry_id, judge_id, criterion_id)
);
create index if not exists scores_judge_idx on public.scores (judge_id);

create table if not exists public.judge_notes (
  entry_id   uuid not null references public.entries (id) on delete cascade,
  judge_id   uuid not null references public.profiles (id) on delete cascade,
  note       text not null check (char_length(note) <= 1000),
  updated_at timestamptz not null default now(),
  primary key (entry_id, judge_id)
);

-- ----------------------------------------------------------------------------
-- YÖNETİCİ: tırnakların arasına kendi Google adresini yaz
-- ----------------------------------------------------------------------------
insert into public.role_invites (email, role) values (lower(btrim('ornek@gmail.com')), 'admin') on conflict (email) do nothing;

-- Davet listesindeki adresle daha önce giriş yapmış olanlara rolünü ver
update public.profiles p
set role = i.role
from public.role_invites i
where lower(p.email) = i.email and p.role = 'user';

-- ----------------------------------------------------------------------------
-- Yardımcı fonksiyonlar (güvenlik kurallarında kullanılır)
-- ----------------------------------------------------------------------------
create or replace function public.current_role_name()
returns public.app_role
language sql stable security definer set search_path = ''
as $$ select coalesce((select role from public.profiles where id = auth.uid()), 'user'::public.app_role) $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$ select public.current_role_name() = 'admin' $$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$ select public.current_role_name() in ('jury', 'admin') $$;

create or replace function public.current_phase()
returns public.contest_phase
language sql stable security definer set search_path = ''
as $$ select phase from public.settings where id = 1 $$;

create or replace function public.can_submit_more()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select (select count(*) from public.entries where user_id = auth.uid())
       < (select max_entries_per_user from public.settings where id = 1)
$$;

create or replace function public.is_public_finalist(p_entry uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.entries where id = p_entry and status = 'finalist')
     and public.current_phase() in ('voting', 'results')
$$;

-- ----------------------------------------------------------------------------
-- Yeni kullanıcı → profil (davet varsa rolüyle)
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    lower(new.email),
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 80),
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce((select i.role from public.role_invites i where i.email = lower(new.email)), 'user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Satır düzeyi güvenlik (RLS)
-- ----------------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.role_invites enable row level security;
alter table public.settings     enable row level security;
alter table public.entries      enable row level security;
alter table public.votes        enable row level security;
alter table public.criteria     enable row level security;
alter table public.scores       enable row level security;
alter table public.judge_notes  enable row level security;

-- Profiller: herkes kendini, yönetici herkesi görür; rolü yalnızca yönetici değiştirir
drop policy if exists "profil okuma" on public.profiles;
create policy "profil okuma" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "profil güncelleme (yönetici)" on public.profiles;
create policy "profil güncelleme (yönetici)" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Davetler: yalnızca yönetici
drop policy if exists "davetler (yönetici)" on public.role_invites;
create policy "davetler (yönetici)" on public.role_invites
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Ayarlar: herkes okur, yönetici değiştirir
drop policy if exists "ayar okuma" on public.settings;
create policy "ayar okuma" on public.settings
  for select to anon, authenticated using (true);
drop policy if exists "ayar güncelleme (yönetici)" on public.settings;
create policy "ayar güncelleme (yönetici)" on public.settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Başvurular
--   • sahibi kendi başvurusunu, jüri ve yönetici hepsini görür
--   • oylama ve sonuç aşamasında finalistler herkese (girişsizlere de) açılır
drop policy if exists "başvuru okuma" on public.entries;
create policy "başvuru okuma" on public.entries
  for select to anon, authenticated using (
    user_id = auth.uid()
    or public.is_staff()
    or (status = 'finalist' and public.current_phase() in ('voting', 'results'))
  );

--   • yalnızca başvuru aşamasında, kendi adına, kendi klasöründeki dosyalarla, sınır dahilinde
drop policy if exists "başvuru ekleme" on public.entries;
create policy "başvuru ekleme" on public.entries
  for insert to authenticated with check (
    user_id = auth.uid()
    and status = 'submitted'
    and public.current_phase() = 'submissions'
    and audio_path like auth.uid()::text || '/' || id::text || '.%'
    and cover_path like auth.uid()::text || '/' || id::text || '.%'
    and public.can_submit_more()
  );

--   • durumu (finalist / yarışma dışı) yalnızca yönetici değiştirir
drop policy if exists "başvuru güncelleme (yönetici)" on public.entries;
create policy "başvuru güncelleme (yönetici)" on public.entries
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

--   • sahibi yalnızca başvuru aşamasında geri çeker; yönetici her zaman silebilir
drop policy if exists "başvuru silme" on public.entries;
create policy "başvuru silme" on public.entries
  for delete to authenticated using (
    (user_id = auth.uid() and public.current_phase() = 'submissions')
    or public.is_admin()
  );

-- Oylar: kişi yalnızca kendi oyunu görür; yalnızca oylamada, bir finaliste verir
drop policy if exists "oy okuma" on public.votes;
create policy "oy okuma" on public.votes
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "oy verme" on public.votes;
create policy "oy verme" on public.votes
  for insert to authenticated with check (
    user_id = auth.uid()
    and public.current_phase() = 'voting'
    and exists (select 1 from public.entries e where e.id = entry_id and e.status = 'finalist')
  );
drop policy if exists "oy değiştirme" on public.votes;
create policy "oy değiştirme" on public.votes
  for update to authenticated
  using (user_id = auth.uid() and public.current_phase() = 'voting')
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.entries e where e.id = entry_id and e.status = 'finalist')
  );

-- Kriterler: herkes okur, yönetici düzenler
drop policy if exists "kriter okuma" on public.criteria;
create policy "kriter okuma" on public.criteria
  for select to anon, authenticated using (true);
drop policy if exists "kriter düzenleme (yönetici)" on public.criteria;
create policy "kriter düzenleme (yönetici)" on public.criteria
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Puanlar ve notlar: jüri yalnızca kendininkini, yönetici hepsini görür.
-- Yazma yalnızca jury_save() fonksiyonuyla (aşama ve yetki kontrollü) yapılır.
drop policy if exists "puan okuma" on public.scores;
create policy "puan okuma" on public.scores
  for select to authenticated using (judge_id = auth.uid() or public.is_admin());
drop policy if exists "not okuma" on public.judge_notes;
create policy "not okuma" on public.judge_notes
  for select to authenticated using (judge_id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------------------
-- Yetkiler
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.settings, public.entries, public.criteria to anon;
grant select, update on public.profiles, public.settings to authenticated;
grant select, insert, update, delete on public.role_invites, public.entries, public.votes, public.criteria
  to authenticated;
grant select on public.scores, public.judge_notes to authenticated;

-- ----------------------------------------------------------------------------
-- Fonksiyonlar (RPC)
-- ----------------------------------------------------------------------------

-- Oy sayıları: oylama sürerken yalnızca yöneticiye, sonuç aşamasında herkese
create or replace function public.vote_results()
returns table (entry_id uuid, votes bigint)
language sql stable security definer set search_path = ''
as $$
  select e.id, count(v.user_id)
  from public.entries e
  left join public.votes v on v.entry_id = e.id
  where e.status = 'finalist'
    and (public.is_admin() or public.current_phase() = 'results')
  group by e.id
$$;

-- Jüri kaydı: bir şarkının tüm kriter puanları ve notu tek seferde.
--   p_scores: {"<kriter-id>": 1..10, ...}
create or replace function public.jury_save(p_entry uuid, p_scores jsonb, p_note text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  k text;
  v numeric;
begin
  if not public.is_staff() then
    raise exception 'Puan vermek için jüri üyesi olmalısın.' using errcode = '42501';
  end if;
  if public.current_phase() <> 'review' then
    raise exception 'Puanlama yalnızca jüri değerlendirmesi aşamasında yapılabilir.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.entries where id = p_entry) then
    raise exception 'Şarkı bulunamadı.' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.entries where id = p_entry and user_id = auth.uid()) then
    raise exception 'Kendi şarkını puanlayamazsın.' using errcode = 'P0001';
  end if;
  for k, v in select key, value::numeric from jsonb_each_text(coalesce(p_scores, '{}'::jsonb)) loop
    if v is null or v <> trunc(v) or v < 1 or v > 10 then
      raise exception 'Puanlar 1 ile 10 arasında tam sayı olmalı.' using errcode = 'P0001';
    end if;
    if k !~ '^[0-9]+$' or not exists (select 1 from public.criteria where id = k::bigint) then
      raise exception 'Geçersiz kriter.' using errcode = 'P0001';
    end if;
    insert into public.scores (entry_id, judge_id, criterion_id, score)
    values (p_entry, auth.uid(), k::bigint, v::smallint)
    on conflict (entry_id, judge_id, criterion_id)
      do update set score = excluded.score, updated_at = now();
  end loop;
  if nullif(btrim(coalesce(p_note, '')), '') is null then
    delete from public.judge_notes where entry_id = p_entry and judge_id = auth.uid();
  else
    insert into public.judge_notes (entry_id, judge_id, note)
    values (p_entry, auth.uid(), left(btrim(p_note), 1000))
    on conflict (entry_id, judge_id) do update set note = excluded.note, updated_at = now();
  end if;
end;
$$;

-- Jüri sonuçları (yalnızca yönetici): şarkı başına ağırlıklı ortalama, puan veren jüri sayısı
-- ve kriter ortalamaları. Her jürinin ortalaması kriter ağırlıklarıyla hesaplanır,
-- sonra jürilerin ortalaması alınır.
create or replace function public.jury_results()
returns table (entry_id uuid, judges int, score numeric, criteria jsonb)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Bu bilgiyi yalnızca yöneticiler görebilir.' using errcode = '42501';
  end if;
  return query
    with per_judge as (
      select s.entry_id, s.judge_id, sum(s.score * c.weight) / sum(c.weight) as avg_score
      from public.scores s join public.criteria c on c.id = s.criterion_id
      group by s.entry_id, s.judge_id
    ),
    per_criterion as (
      select x.entry_id, jsonb_object_agg(x.criterion_id::text, x.avg_score) as scores
      from (
        select s.entry_id, s.criterion_id, round(avg(s.score), 2) as avg_score
        from public.scores s group by s.entry_id, s.criterion_id
      ) x
      group by x.entry_id
    )
    select pj.entry_id, count(*)::int, round(avg(pj.avg_score), 2), coalesce(pc.scores, '{}'::jsonb)
    from per_judge pj
    left join per_criterion pc on pc.entry_id = pj.entry_id
    group by pj.entry_id, pc.scores;
end;
$$;

-- Jüri ilerlemesi (yalnızca yönetici): her jüri üyesi kaç şarkıyı tamamen puanladı
create or replace function public.jury_progress()
returns table (judge_id uuid, email text, full_name text, completed int)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Bu bilgiyi yalnızca yöneticiler görebilir.' using errcode = '42501';
  end if;
  return query
    select p.id, p.email, p.full_name,
      (select count(*)::int from (
         select s.entry_id from public.scores s
         where s.judge_id = p.id
         group by s.entry_id
         having count(*) >= (select count(*) from public.criteria)
       ) done)
    from public.profiles p
    where p.role in ('jury', 'admin')
    order by p.role desc, p.email;
end;
$$;

revoke execute on function public.jury_save(uuid, jsonb, text), public.jury_results(), public.jury_progress()
  from public, anon;
grant execute on function public.jury_save(uuid, jsonb, text), public.jury_results(), public.jury_progress()
  to authenticated;
grant execute on function public.vote_results() to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Dosya depolama
--   audio : gizli; sahibi, jüri/yönetici ve (oylamada) finalistlerinki herkese açık
--   covers: herkese açık kova (tahmin edilemez adresler; bağlantı önizlemeleri için)
--   Dosya yolu: <kullanıcı-id>/<başvuru-id>.<uzantı>
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('audio', 'audio', false, 10485760, array['audio/mpeg', 'audio/mp4']),
  ('covers', 'covers', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "dosya yükleme" on storage.objects;
create policy "dosya yükleme" on storage.objects
  for insert to authenticated with check (
    bucket_id in ('audio', 'covers')
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_phase() = 'submissions'
  );

drop policy if exists "dosya okuma" on storage.objects;
create policy "dosya okuma" on storage.objects
  for select to anon, authenticated using (
    bucket_id in ('audio', 'covers')
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_staff()
      or bucket_id = 'covers'
      or exists (
        select 1 from public.entries e
        where e.audio_path = storage.objects.name
          and public.is_public_finalist(e.id)
      )
    )
  );

drop policy if exists "dosya silme" on storage.objects;
create policy "dosya silme" on storage.objects
  for delete to authenticated using (
    bucket_id in ('audio', 'covers')
    and (
      ((storage.foldername(name))[1] = auth.uid()::text and public.current_phase() = 'submissions')
      or public.is_admin()
    )
  );

-- =============================================================================
-- Sorun giderme: girişten sonra Yönetim menüsü görünmüyorsa şunu çalıştır:
--   update public.profiles set role = 'admin' where email = 'senin@gmail.com';
-- =============================================================================
