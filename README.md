# Helezon

Felsefe tarihindeki filozofları, akımları ve kavramları anahtar kelimeyle arayıp özetini ve aralarındaki bağları (hoca/öğrenci, etkileme, eleştiri, temsil, geliştirme, köken, karşıtlık) harita üzerinde gösteren Türkçe uygulama. Telefona kurulabilir (PWA) ve internet olmadan da çalışır.

Yayın adresi: https://logos514.github.io/helezon/ (Sophidex'ten kopyalanarak başlatıldı.)

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
