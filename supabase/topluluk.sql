-- HELEZON — Topluluk alanı veritabanı şeması
--
-- Helezon'a ait, AYRI bir Supabase projesi içindir (Agora ile ilgisi yoktur).
-- Kurulum: Supabase panelinde SQL Editor'ü aç, bu dosyanın tamamını yapıştır, "Run".
-- Dosya tekrar tekrar çalıştırılabilir.

create extension if not exists "pgcrypto";

-- 1) Profiller: her hesap için kullanıcı adı ve rol (uye / yonetici).
create table if not exists profiller (
  id uuid primary key references auth.users(id) on delete cascade,
  kullanici_adi text not null check (char_length(btrim(kullanici_adi)) between 2 and 40),
  rol text not null default 'uye' check (rol in ('uye', 'yonetici')),
  created_at timestamptz not null default now()
);
create unique index if not exists profiller_ad_tekil on profiller (lower(kullanici_adi));

-- Yeni hesap açılınca profil otomatik oluşur. Kullanıcı adı kayıt formundan gelir;
-- alınmışsa sonuna sayı eklenir.
create or replace function hz_yeni_kullanici()
returns trigger as $$
declare
  ad text := left(btrim(coalesce(new.raw_user_meta_data->>'kullanici_adi', split_part(new.email, '@', 1))), 36);
  aday text;
  i int := 1;
begin
  if char_length(ad) < 2 then ad := 'okur'; end if;
  aday := ad;
  while exists (select 1 from public.profiller where lower(kullanici_adi) = lower(aday)) loop
    i := i + 1;
    aday := ad || i;
  end loop;
  insert into public.profiller (id, kullanici_adi) values (new.id, aday);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists hz_yeni_kullanici_trg on auth.users;
create trigger hz_yeni_kullanici_trg
  after insert on auth.users
  for each row execute procedure hz_yeni_kullanici();

create or replace function hz_yonetici()
returns boolean as $$
  select exists (select 1 from public.profiller where id = auth.uid() and rol = 'yonetici');
$$ language sql stable security definer set search_path = public;

-- 2) Konular: tartışma, soru ya da yazı. İsteğe bağlı olarak bir atlas kaydına
--    (ör. "kant", "varolusculuk") bağlanır.
create table if not exists konular (
  id uuid primary key default gen_random_uuid(),
  baslik text not null check (char_length(btrim(baslik)) between 3 and 160),
  govde text not null check (char_length(btrim(govde)) between 1 and 20000),
  tur text not null default 'tartisma' check (tur in ('tartisma', 'soru', 'yazi')),
  atlas_id text check (atlas_id is null or atlas_id ~ '^[a-z0-9-]{1,60}$'),
  yazar_id uuid not null default auth.uid() references profiller(id) on delete cascade,
  yanit_sayisi integer not null default 0,
  son_etkinlik timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists konular_son_idx on konular (son_etkinlik desc);
create index if not exists konular_atlas_idx on konular (atlas_id);

-- 3) Yanıtlar: bir konunun altındaki katkılar.
create table if not exists yanitlar (
  id uuid primary key default gen_random_uuid(),
  konu_id uuid not null references konular(id) on delete cascade,
  govde text not null check (char_length(btrim(govde)) between 1 and 10000),
  yazar_id uuid not null default auth.uid() references profiller(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists yanitlar_konu_idx on yanitlar (konu_id, created_at);

-- 4) Yanıt sayısı ve son etkinlik zamanı otomatik güncellenir.
create or replace function hz_yanit_sayac()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update konular set yanit_sayisi = yanit_sayisi + 1, son_etkinlik = now() where id = new.konu_id;
  elsif tg_op = 'DELETE' then
    update konular set yanit_sayisi = greatest(yanit_sayisi - 1, 0) where id = old.konu_id;
  end if;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists hz_yanit_sayac_trg on yanitlar;
create trigger hz_yanit_sayac_trg
  after insert or delete on yanitlar
  for each row execute procedure hz_yanit_sayac();

-- Kullanıcı sayaçları ya da tarihleri elle değiştiremesin.
create or replace function hz_konu_koru()
returns trigger as $$
begin
  new.yanit_sayisi := 0;
  new.son_etkinlik := now();
  new.created_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists hz_konu_koru_trg on konular;
create trigger hz_konu_koru_trg
  before insert on konular
  for each row execute procedure hz_konu_koru();

-- 5) Güvenlik kuralları (RLS)
alter table profiller enable row level security;
alter table konular enable row level security;
alter table yanitlar enable row level security;

-- Herkes okuyabilir (giriş gerekmez).
drop policy if exists "profiller herkese acik" on profiller;
create policy "profiller herkese acik" on profiller for select using (true);
drop policy if exists "konular herkese acik" on konular;
create policy "konular herkese acik" on konular for select using (true);
drop policy if exists "yanitlar herkese acik" on yanitlar;
create policy "yanitlar herkese acik" on yanitlar for select using (true);

-- Giriş yapan kullanıcı yalnızca kendi adına yazabilir.
drop policy if exists "giris yapan konu acar" on konular;
create policy "giris yapan konu acar" on konular for insert
  with check (auth.uid() is not null and auth.uid() = yazar_id);
drop policy if exists "giris yapan yanit yazar" on yanitlar;
create policy "giris yapan yanit yazar" on yanitlar for insert
  with check (auth.uid() is not null and auth.uid() = yazar_id);

-- Yazar kendi içeriğini, yönetici her içeriği silebilir.
drop policy if exists "konu silme" on konular;
create policy "konu silme" on konular for delete using (auth.uid() = yazar_id or hz_yonetici());
drop policy if exists "yanit silme" on yanitlar;
create policy "yanit silme" on yanitlar for delete using (auth.uid() = yazar_id or hz_yonetici());

-- Profiller, düzenleme ve rol değişikliği yalnızca panelden yapılır (politika yok = kimse değiştiremez).

-- Kendini yönetici yapmak için: siteye bir kez kayıt ol, sonra şu satırı
-- kendi kullanıcı adınla çalıştır:
--   update profiller set rol = 'yonetici' where kullanici_adi = 'KULLANICI-ADIN';
