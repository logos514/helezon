-- HELEZON — Topluluk alanı veritabanı şeması
--
-- Agora ile AYNI Supabase projesinde çalışır: Agora'nın "profiles" tablosunu
-- (kullanıcı adı ve admin rolü) ve hesaplarını kullanır. Böylece Agora hesabı olan
-- herkes Helezon'da da aynı e-posta ve şifreyle yazabilir.
--
-- Kurulum: Supabase panelinde SQL Editor'ü aç, bu dosyanın tamamını yapıştır, "Run".
-- Dosya tekrar tekrar çalıştırılabilir; Agora'nın tablolarına dokunmaz.
-- Tabloların hepsi "hz_" önekiyle başlar.

create extension if not exists "pgcrypto";

-- 1) Konular: tartışma, soru ya da yazı. İsteğe bağlı olarak bir atlas kaydına
--    (ör. "kant", "varolusculuk") bağlanır.
create table if not exists hz_konular (
  id uuid primary key default gen_random_uuid(),
  baslik text not null check (char_length(btrim(baslik)) between 3 and 160),
  govde text not null check (char_length(btrim(govde)) between 1 and 20000),
  tur text not null default 'tartisma' check (tur in ('tartisma', 'soru', 'yazi')),
  atlas_id text check (atlas_id is null or atlas_id ~ '^[a-z0-9-]{1,60}$'),
  yazar_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  yanit_sayisi integer not null default 0,
  son_etkinlik timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists hz_konular_son_idx on hz_konular (son_etkinlik desc);
create index if not exists hz_konular_atlas_idx on hz_konular (atlas_id);

-- 2) Yanıtlar: bir konunun altındaki katkılar.
create table if not exists hz_yanitlar (
  id uuid primary key default gen_random_uuid(),
  konu_id uuid not null references hz_konular(id) on delete cascade,
  govde text not null check (char_length(btrim(govde)) between 1 and 10000),
  yazar_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists hz_yanitlar_konu_idx on hz_yanitlar (konu_id, created_at);

-- 3) Yanıt sayısı ve son etkinlik zamanı otomatik güncellenir.
create or replace function hz_yanit_sayac()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update hz_konular set yanit_sayisi = yanit_sayisi + 1, son_etkinlik = now() where id = new.konu_id;
  elsif tg_op = 'DELETE' then
    update hz_konular set yanit_sayisi = greatest(yanit_sayisi - 1, 0) where id = old.konu_id;
  end if;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists hz_yanit_sayac_trg on hz_yanitlar;
create trigger hz_yanit_sayac_trg
  after insert or delete on hz_yanitlar
  for each row execute procedure hz_yanit_sayac();

-- Kullanıcı sayaçları ya da tarihleri elle değiştiremesin.
create or replace function hz_konu_koru()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    new.yanit_sayisi := 0;
    new.son_etkinlik := now();
    new.created_at := now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists hz_konu_koru_trg on hz_konular;
create trigger hz_konu_koru_trg
  before insert on hz_konular
  for each row execute procedure hz_konu_koru();

-- 4) Güvenlik kuralları (RLS)
alter table hz_konular enable row level security;
alter table hz_yanitlar enable row level security;

-- Herkes okuyabilir (giriş gerekmez).
drop policy if exists "hz konular herkese acik" on hz_konular;
create policy "hz konular herkese acik" on hz_konular for select using (true);
drop policy if exists "hz yanitlar herkese acik" on hz_yanitlar;
create policy "hz yanitlar herkese acik" on hz_yanitlar for select using (true);

-- Giriş yapan kullanıcı yalnızca kendi adına yazabilir.
drop policy if exists "hz giris yapan konu acar" on hz_konular;
create policy "hz giris yapan konu acar" on hz_konular for insert
  with check (auth.uid() is not null and auth.uid() = yazar_id);
drop policy if exists "hz giris yapan yanit yazar" on hz_yanitlar;
create policy "hz giris yapan yanit yazar" on hz_yanitlar for insert
  with check (auth.uid() is not null and auth.uid() = yazar_id);

-- Yazar kendi içeriğini, admin her içeriği silebilir.
drop policy if exists "hz konu silme" on hz_konular;
create policy "hz konu silme" on hz_konular for delete
  using (auth.uid() = yazar_id or exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
drop policy if exists "hz yanit silme" on hz_yanitlar;
create policy "hz yanit silme" on hz_yanitlar for delete
  using (auth.uid() = yazar_id or exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Güncelleme (düzenleme) bu sürümde kapalı: politikası olmadığı için kimse değiştiremez.
