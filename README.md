# Helezon

Felsefe tarihindeki filozofları, akımları ve kavramları anahtar kelimeyle arayıp özetini ve aralarındaki bağları (hoca/öğrenci, etkileme, eleştiri, temsil, geliştirme, köken, karşıtlık) harita üzerinde gösteren Türkçe uygulama. Telefona kurulabilir (PWA) ve internet olmadan da çalışır.

Yayın adresi: https://logos514.github.io/helezon/ (Sophidex'ten kopyalanarak başlatıldı.)

## İki yön: Akademik ve Topluluk
Üstteki seçici uygulamayı ikiye ayırır.

- **Akademik:** Atlas ve Soy ağacı. İçerik `src/` dosyalarından derlenir, PR ile gözden geçirilerek değişir; her ayrıntı sayfasında "Akademik kayıt" rozeti vardır. Kullanıcılar bu tarafı değiştiremez.
- **Topluluk** (`#topluluk`): herkes okuyabilir; giriş yapan herkes konu açabilir (Tartışma, Soru, Yazı) ve yanıt yazabilir. Bir konu bir atlas kaydına bağlanabilir; metinde `[[Kant]]` yazmak o kayda bağlantı olur. Her akademik sayfanın altında o kayıtla ilgili topluluk konularına giden bir düğme ve konu sayısı vardır. Yazar kendi yazısını, Agora'daki yöneticiler her yazıyı silebilir.

Rotalar: `#topluluk`, `#topluluk-k-<konu id>`, `#topluluk-kayit-<atlas id>`, `#topluluk-yeni`, `#topluluk-giris`.

### Topluluk kurulumu (Supabase)
Topluluk yazıları Agora'nın Supabase projesinde, `hz_` önekli tablolarda durur; hesaplar ve kullanıcı adları Agora ile ortaktır.
1. Supabase panelinde **SQL Editor**'de `supabase/topluluk.sql` dosyasının tamamını çalıştırın (Agora tablolarına dokunmaz, tekrar çalıştırılabilir).
2. **Project Settings → API**'deki `Project URL` ve `anon public` anahtarını `topluluk-ayar.js` dosyasına yazın.
3. İsteğe bağlı: **Authentication → URL Configuration → Redirect URLs** listesine `https://logos514.github.io/helezon/**` ekleyin; böylece Helezon'dan kayıt olanların onay bağlantısı Helezon'a döner.
4. `sw.js` içindeki `SURUM` değerini artırın.

`topluluk-ayar.js` boşsa akademik taraf normal çalışır, Topluluk sekmesi "henüz bağlanmadı" der. Topluluk tarafı çevrimdışı çalışmaz; Supabase kütüphanesi yalnızca Topluluk açıldığında yüklenir.

## Soy ağacı
Üstteki **Soy ağacı** sekmesi iki görünüm sunar. **Ağaç** görünümü filozofları zaman sırasıyla satırlara dizip etki ve hoca-öğrenci bağlarını çizgilerle gösteren bir diyagramdır; bir düğüme dokununca öncüller turuncu, ardıllar yeşil vurgulanır ve temel düşünce bir panelde açılır (−/+ ile yakınlaştırılır). **Kartlar** görünümü filozofları doğum yılına göre dikey bir zaman ekseninde dizer. Her kartta kimden etkilendiği, getirdiği yeni düşünce, en fazla üç cümlelik temel düşüncesi ve kimleri etkilediği yazar. Soldaki yaylar etki ve hoca-öğrenci bağlarıdır. Bir düşünüre dokununca öncülleri ve ardılları 1, 2 ya da tüm kuşaklar boyunca vurgulanır; "Yalnızca soy hattı" ile geri kalanlar gizlenir. Doğrudan bağlantı: `#soy-kant`.

## Telefona kurma
- **Android (Chrome):** Siteyi açın, menüden "Uygulamayı yükle" ya da "Ana ekrana ekle"yi seçin.
- **iPhone (Safari):** Siteyi açın, Paylaş düğmesine dokunun, "Ana Ekrana Ekle"yi seçin.

İlk açılıştan sonra uygulama ve tüm veri cihaza kaydedilir, internet yokken de açılır.

## Dosyalar
- `index.html`: arayüz (arama, süzgeçler, ayrıntı sayfası, bağ haritası). Kütüphane kullanmaz.
- `veri.json`: derlenmiş veri; `src/derle.js` üretir, elle düzenlenmez.
- `src/veri-filozoflar.js`, `src/veri-akimlar.js`, `src/veri-kavramlar.js`: kayıtlar.
- `src/veri-soy.js`: her filozof için doğum yılı (`y`), getirdiği yeni düşünce (`yn`) ve en fazla 3 cümlelik temel düşünce (`o`).
- `src/veri-detay-filozoflar.js`, `src/veri-detay-akimlar.js`: ayrıntı sayfasındaki uzun bölümler: `hb` hayatı ya da doğuşu ve bağlamı, `em` etkisi ve mirası, `ek` eleştiriler.
- `src/veri-baglar.js`: bağlar, her satırda `kaynak ilişki hedef`.
- `topluluk.js`: Topluluk tarafı (konu listesi, konu sayfası, yeni konu, giriş/kayıt). `topluluk-ayar.js`: Supabase adresi ve anon anahtarı. `supabase/topluluk.sql`: tablolar ve güvenlik kuralları.
- `manifest.webmanifest`, `sw.js`, `simgeler/`: telefona kurulum, çevrimdışı çalışma ve simgeler.
- `src/artifact.js`: claude.ai sürümü için gövde parçası üretir.
- `.github/workflows/`: her pull request'te veriyi doğrular; `main` dalına her birleştirmede siteyi GitHub Pages'a yayınlar.

## Veri ekleme
1. İlgili `src/veri-*.js` dosyasına kayıt ekleyin (`id`, `n` ad, `al` diğer adlar, `e` dönem, `d` tarih, `r` yer, `s` özet, `i` ana fikirler, `w` eserler, `k` anahtar kelimeler).
2. Filozofsa `src/veri-soy.js` dosyasına `y`, `yn` ve `o` alanlarını ekleyin; filozof ya da akımsa `src/veri-detay-*.js` dosyasına `hb`, `em`, `ek` bölümlerini yazın (derleme bunları zorunlu tutar).
3. `src/veri-baglar.js` dosyasına bağlarını ekleyin.
4. `node src/derle.js` çalıştırın. Bilinmeyen id, yinelenen bağ ya da geçersiz dönem varsa hata verir.
5. Arayüz ya da veri değiştiyse `sw.js` içindeki `SURUM` değerini artırın; kurulu uygulamalar yeni sürümü böyle alır.

Dönemler: `dogu, antik, helenistik, ortacag, islam, ronesans, modern, aydinlanma, ondokuz, yirmi`.
İlişkiler: `hoca, etkiledi, elestirdi, temsil, kurdu, gelistirdi, dogurdu, karsi, kavram, ilgili`.

## Yerelde çalıştırma
`veri.json` fetch ile okunduğu için bir yerel sunucu gerekir: `python3 -m http.server` ve tarayıcıda `http://localhost:8000`.
