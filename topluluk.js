// Helezon — Topluluk tarafı.
// Akademik atlas veri.json'dan okunur ve değişmez; topluluk yazıları ve hesaplar Helezon'un
// kendi Supabase projesinde durur (bkz. supabase/topluluk.sql). Başka bir uygulamayla bağı yoktur.
// Rotalar: #topluluk, #topluluk-k-<konu id>, #topluluk-kayit-<atlas id>, #topluluk-yeni, #topluluk-yeni-<atlas id>,
// #topluluk-giris, #topluluk-sifre (şifre sıfırlama bağlantısından dönüşte yeni şifre)
(function () {
  "use strict";
  var AYAR = window.HELEZON_TOPLULUK || {};
  var HAZIR = !!(AYAR.url && AYAR.anahtar);
  var KUTUPHANE = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
  var TURLER = { tartisma: "Tartışma", soru: "Soru", yazi: "Yazı" };
  var SAYFA = 30;

  var c = null;          // index.html'den gelen bağlam: V, LISTE, esc, norm, TUR, main
  var sb = null, yukleme = null;
  var oturum = null, profil = null;
  var son = "";          // son çizilen rota
  var liste = { tur: "", q: "", adet: SAYFA };

  function esc(s) { return c.esc(s == null ? "" : s); }
  function el(id) { return document.getElementById(id); }

  // ---------- Supabase ----------
  function yukle() {
    if (sb) return Promise.resolve(sb);
    if (yukleme) return yukleme;
    yukleme = new Promise(function (tamam, hata) {
      var s = document.createElement("script");
      s.src = KUTUPHANE; s.async = true;
      s.onload = function () {
        try {
          sb = window.supabase.createClient(AYAR.url, AYAR.anahtar, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "helezon-oturum" }
          });
        } catch (e) { hata(e); return; }
        sb.auth.getSession().then(function (r) {
          oturum = r.data.session;
          return profilYukle();
        }).then(function () {
          sb.auth.onAuthStateChange(function (olay, s) {
            var onceki = oturum && oturum.user.id;
            oturum = s;
            if ((s && s.user.id) !== onceki) profilYukle().then(yenidenCiz);
          });
          tamam(sb);
        }, hata);
      };
      s.onerror = function () { yukleme = null; hata(new Error("kütüphane yüklenemedi")); };
      document.head.appendChild(s);
    });
    return yukleme;
  }
  function profilYukle() {
    if (!oturum) { profil = null; return Promise.resolve(); }
    return sb.from("profiller").select("kullanici_adi, rol").eq("id", oturum.user.id).maybeSingle().then(function (r) {
      profil = r.data || { kullanici_adi: (oturum.user.email || "").split("@")[0], rol: "uye" };
    });
  }
  function yonetici() { return !!(profil && profil.rol === "yonetici"); }
  function benim(yazarId) { return !!(oturum && oturum.user.id === yazarId); }

  // Akademik detay sayfasındaki "Toplulukta N konu" sayacı: kütüphaneyi yüklemeden tek bir REST isteği.
  function sayac(atlasId, hedef) {
    if (!HAZIR || !hedef || !navigator.onLine) return;
    fetch(AYAR.url.replace(/\/$/, "") + "/rest/v1/konular?select=id&atlas_id=eq." + encodeURIComponent(atlasId), {
      headers: { apikey: AYAR.anahtar, Authorization: "Bearer " + AYAR.anahtar, Prefer: "count=exact", Range: "0-0" }
    }).then(function (r) {
      var m = (r.headers.get("content-range") || "").match(/\/(\d+)$/);
      if (!r.ok || !m || !document.body.contains(hedef)) return;
      var n = +m[1];
      hedef.textContent = n ? n + " konu açılmış" : "Henüz konu açılmamış; ilk sen aç";
    }).catch(function () {});
  }

  // ---------- Yardımcılar ----------
  function tarih(s) {
    var d = new Date(s), fark = (Date.now() - d.getTime()) / 1000;
    if (fark < 60) return "az önce";
    if (fark < 3600) return Math.floor(fark / 60) + " dk önce";
    if (fark < 86400) return Math.floor(fark / 3600) + " sa önce";
    if (fark < 86400 * 7) return Math.floor(fark / 86400) + " gün önce";
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  }
  function yazarAdi(x) { return (x.yazar && x.yazar.kullanici_adi) || "isimsiz"; }

  // [[Kant]] ya da [[kant]] yazımını atlas kaydına bağlantıya çevirir.
  function atlasBul(metin) {
    var n = c.norm(metin).trim();
    if (c.V[n]) return c.V[n];
    for (var i = 0; i < c.LISTE.length; i++) {
      var v = c.LISTE[i];
      if (v._ad === n || (v._al && v._al.indexOf(n) !== -1)) return v;
    }
    return null;
  }
  function atlasCip(v) {
    return '<button class="link-chip" data-id="' + v.id + '" title="Akademik kayda git"><span class="dot ' + v.t + '"></span>' + esc(v.n) + "</button>";
  }
  function metinCiz(s) {
    return String(s).split(/\n{2,}/).map(function (p) {
      var h = esc(p.trim()).replace(/\[\[([^\]\n]{1,60})\]\]/g, function (tam, ad) {
        var v = atlasBul(ad.replace(/&amp;/g, "&"));
        return v ? atlasCip(v) : tam;
      }).replace(/\n/g, "<br>");
      return h ? "<p>" + h + "</p>" : "";
    }).join("");
  }
  function hataMetni(e) {
    var m = (e && (e.message || e.error_description)) || "";
    if (/Invalid login credentials/i.test(m)) return "E-posta ya da şifre hatalı.";
    if (/Email not confirmed/i.test(m)) return "E-postan henüz onaylanmamış. Gelen kutundaki bağlantıya tıkla.";
    if (/already registered/i.test(m)) return "Bu e-postayla zaten bir hesap var; giriş yapmayı dene.";
    if (/Password should be/i.test(m)) return "Şifre en az 6 karakter olmalı.";
    if (/different from the old/i.test(m)) return "Yeni şifre eskisinden farklı olmalı.";
    if (/rate limit|security purposes/i.test(m)) return "Çok sık denendi. Biraz bekleyip yeniden dene.";
    if (/relation .* does not exist|schema cache|Could not find the table/i.test(m)) return "Topluluk tabloları veritabanında bulunamadı (kurulum SQL'i çalıştırılmamış olabilir).";
    if (/row-level security|violates/i.test(m)) return "Bu işlem için yetkin yok ya da içerik kurallara uymuyor.";
    if (/Failed to fetch|NetworkError|kütüphane/i.test(m)) return "Bağlantı kurulamadı. İnternet bağlantını kontrol et.";
    return "Bir sorun oluştu" + (m ? ": " + m : ".");
  }

  // ---------- Çizim ----------
  function ust(baslik, alt) {
    var kullanici = oturum
      ? '<span>Giriş yapan: <b>' + esc(profil ? profil.kullanici_adi : "") + '</b>' + (yonetici() ? ' <span class="tk-etiket">yönetici</span>' : "") + '</span> <button class="tk-bag" data-tk="cikis">Çıkış</button>'
      : '<a href="#topluluk-giris">Giriş yap / Kayıt ol</a>';
    return '<div class="tk-uyari" role="note"><b>Topluluk alanı.</b> Buradaki yazılar kullanıcılar tarafından yazılır, Helezon tarafından doğrulanmaz. ' +
      'Doğruluğu denetlenmiş bilgi için <a href="#">Akademik</a> tarafa bakın.</div>' +
      '<div class="tk-bas"><div><div class="eyebrow"><span class="t-tk">Topluluk</span>' + (alt ? "<span>·</span><span>" + alt + "</span>" : "") + '</div>' +
      (baslik ? '<h2 class="title">' + baslik + "</h2>" : "") + '</div><div class="tk-kim">' + kullanici + "</div></div>";
  }
  function ciz(html) { c.main.innerHTML = '<article class="card tk">' + html + "</article>"; }
  function bekle(baslik) { ciz(ust(baslik || "") + '<p class="hint" style="margin-top:18px">Yükleniyor…</p>'); }

  function kurulmadi() {
    ciz(ust("Topluluk yakında açılıyor", "") +
      '<p style="margin-top:16px;max-width:65ch">Bu bölümde herkes bir felsefi konuya dalabilecek, okuyabilecek, soru sorup kendi yazısını ve yorumunu ekleyebilecek. ' +
      "Yazılar akademik atlastaki kayıtlara bağlanabilecek. Bölüm henüz veritabanına bağlanmadı.</p>");
  }
  function cevrimdisi(e) {
    ciz(ust("", "") + '<p class="tk-hata" role="alert">' + esc(hataMetni(e)) + '</p><p><button class="chip" data-tk="yenile">Yeniden dene</button></p>');
  }

  function konuSatiri(k) {
    var v = k.atlas_id && c.V[k.atlas_id];
    return '<li><a class="tk-konu" href="#topluluk-k-' + k.id + '">' +
      '<span class="tk-tur tk-' + k.tur + '">' + esc(TURLER[k.tur] || k.tur) + "</span>" +
      '<span class="tk-konu-ad">' + esc(k.baslik) + "</span>" +
      '<span class="tk-meta">' + esc(yazarAdi(k)) + " · " + tarih(k.created_at) + " · " + k.yanit_sayisi + " yanıt" +
      (v ? ' · <span class="dot ' + v.t + '"></span> ' + esc(v.n) : "") + "</span></a></li>";
  }

  function listeCiz(atlasId) {
    var v = atlasId && c.V[atlasId];
    if (atlasId && !v) { location.hash = "topluluk"; return; }
    bekle(v ? esc(v.n) : "Konular");
    var sorgu = sb.from("konular")
      .select("id, baslik, tur, atlas_id, yanit_sayisi, son_etkinlik, created_at, yazar:profiller(kullanici_adi)", { count: "exact" })
      .order("son_etkinlik", { ascending: false })
      .range(0, liste.adet - 1);
    if (v) sorgu = sorgu.eq("atlas_id", atlasId);
    if (liste.tur) sorgu = sorgu.eq("tur", liste.tur);
    if (liste.q.trim()) sorgu = sorgu.ilike("baslik", "%" + liste.q.trim().replace(/[%_\\]/g, "\\$&") + "%");
    var rota = son;
    sorgu.then(function (r) {
      if (rota !== son) return;
      if (r.error) { cevrimdisi(r.error); return; }
      var konular = r.data || [];
      var giris = v
        ? '<p class="tk-giris">Akademik kayıt: ' + atlasCip(v) + ' · Bu kayıtla ilgili topluluk konuları. Tüm konular için <a href="#topluluk">Topluluk ana sayfası</a>.</p>'
        : '<p class="tk-giris">Bir felsefi konuya dal, oku, soru sor ya da kendi yazını ekle. Konular akademik atlastaki filozof, akım ve kavramlara bağlanabilir.</p>';
      var suzgec = '<div class="tk-arac"><div class="filters" role="group" aria-label="Konu türü">' +
        [["", "Tümü"], ["tartisma", "Tartışma"], ["soru", "Soru"], ["yazi", "Yazı"]].map(function (t) {
          return '<button class="chip" data-tk-tur="' + t[0] + '" aria-pressed="' + (liste.tur === t[0]) + '">' + t[1] + "</button>";
        }).join("") + "</div>" +
        '<input class="tk-ara" id="tk-ara" type="search" placeholder="Başlıklarda ara" aria-label="Konu başlıklarında ara" value="' + esc(liste.q) + '">' +
        '<a class="tk-dugme" href="#topluluk-yeni' + (v ? "-" + v.id : "") + '">+ Yeni konu aç</a></div>';
      var govde = konular.length
        ? '<ul class="tk-liste">' + konular.map(konuSatiri).join("") + "</ul>" +
          (r.count > konular.length ? '<p><button class="chip" data-tk="daha">Daha fazla göster (' + (r.count - konular.length) + ")</button></p>" : "")
        : '<p class="empty">' + (liste.q || liste.tur ? "Bu süzgeçle eşleşen konu yok." : v ? "Bu kayıt hakkında henüz konu açılmamış. İlk konuyu sen aç." : "Henüz konu yok. İlk konuyu sen aç.") + "</p>";
      ciz(ust(v ? esc(v.n) : "Konular", v ? c.TUR[v.t] : "") + giris + suzgec + govde);
      var ara = el("tk-ara");
      if (ara && liste._odak) { ara.focus(); ara.setSelectionRange(ara.value.length, ara.value.length); liste._odak = false; }
    }, cevrimdisi);
  }

  function konuCiz(id) {
    bekle("");
    var rota = son;
    Promise.all([
      sb.from("konular").select("id, baslik, govde, tur, atlas_id, yazar_id, yanit_sayisi, created_at, yazar:profiller(kullanici_adi)").eq("id", id).maybeSingle(),
      sb.from("yanitlar").select("id, govde, yazar_id, created_at, yazar:profiller(kullanici_adi)").eq("konu_id", id).order("created_at", { ascending: true })
    ]).then(function (rs) {
      if (rota !== son) return;
      if (rs[0].error) { cevrimdisi(rs[0].error); return; }
      var k = rs[0].data;
      if (!k) { ciz(ust("Konu bulunamadı", "") + '<p>Bu konu silinmiş olabilir. <a href="#topluluk">Konulara dön</a></p>'); return; }
      var yanitlar = rs[1].data || [];
      var v = k.atlas_id && c.V[k.atlas_id];
      var sil = function (tur, x) { return benim(x.yazar_id) || yonetici() ? ' <button class="tk-bag" data-tk-sil="' + tur + ":" + x.id + '">Sil</button>' : ""; };
      var form = oturum
        ? '<form class="tk-form" id="tk-yanit-form"><label for="tk-yanit" class="hint">Yanıtın</label>' +
          '<textarea id="tk-yanit" rows="5" maxlength="10000" required placeholder="Düşünceni, itirazını ya da kaynağını yaz. Atlas kaydına bağlantı için [[Kant]] gibi yazabilirsin."></textarea>' +
          '<p class="tk-hata" id="tk-form-hata" role="alert" hidden></p><button class="tk-dugme" type="submit">Yanıtı gönder</button></form>'
        : '<p class="tk-giris"><a href="#topluluk-giris">Giriş yap</a> ya da kayıt ol, yanıt yaz.</p>';
      document.title = k.baslik + " · Topluluk · Helezon";
      ciz(ust(esc(k.baslik), '<span class="tk-tur tk-' + k.tur + '">' + esc(TURLER[k.tur]) + "</span>") +
        '<p class="tk-meta">' + esc(yazarAdi(k)) + " · " + tarih(k.created_at) + sil("konu", k) + "</p>" +
        (v ? '<p class="tk-giris">İlgili akademik kayıt: ' + atlasCip(v) + ' · <a href="#topluluk-kayit-' + v.id + '">Bu kayıtla ilgili diğer konular</a></p>' : "") +
        '<div class="tk-metin">' + metinCiz(k.govde) + "</div>" +
        '<h3 class="sec" style="margin-top:28px">' + yanitlar.length + " yanıt</h3>" +
        '<ol class="tk-yanitlar">' + yanitlar.map(function (y) {
          return '<li id="y-' + y.id + '"><p class="tk-meta"><b>' + esc(yazarAdi(y)) + "</b> · " + tarih(y.created_at) + sil("yanit", y) + '</p><div class="tk-metin">' + metinCiz(y.govde) + "</div></li>";
        }).join("") + "</ol>" + form +
        '<p style="margin-top:22px"><a href="#topluluk">← Tüm konular</a></p>');
      var f = el("tk-yanit-form");
      if (f) f.addEventListener("submit", function (e) {
        e.preventDefault();
        var metin = el("tk-yanit").value.trim();
        if (!metin) return;
        gonder(f, sb.from("yanitlar").insert({ konu_id: k.id, govde: metin, yazar_id: oturum.user.id }), function () { konuCiz(k.id); });
      });
    }, cevrimdisi);
  }

  function yeniCiz(atlasId) {
    if (!oturum) { ciz(ust("Yeni konu", "") + '<p class="tk-giris" style="margin-top:16px">Konu açmak için <a href="#topluluk-giris">giriş yap ya da kayıt ol</a>. Okumak için giriş gerekmez.</p>'); return; }
    var v = atlasId && c.V[atlasId];
    var secenekler = c.LISTE.map(function (x) { return '<option value="' + esc(x.n + " (" + c.TUR[x.t] + ")") + '"></option>'; }).join("");
    ciz(ust("Yeni konu", "") +
      '<form class="tk-form" id="tk-yeni-form">' +
      '<label class="hint" for="tk-baslik">Başlık</label><input id="tk-baslik" maxlength="160" required placeholder="ör. Kant’ın ödev etiği bugün savunulabilir mi?">' +
      '<div class="tk-iki"><div><label class="hint" for="tk-tur">Tür</label><select id="tk-tur"><option value="tartisma">Tartışma</option><option value="soru">Soru</option><option value="yazi">Yazı (deneme, inceleme)</option></select></div>' +
      '<div><label class="hint" for="tk-atlas">İlgili atlas kaydı (isteğe bağlı)</label><input id="tk-atlas" list="tk-atlas-liste" autocomplete="off" placeholder="Filozof, akım ya da kavram" value="' + (v ? esc(v.n + " (" + c.TUR[v.t] + ")") : "") + '"><datalist id="tk-atlas-liste">' + secenekler + "</datalist></div></div>" +
      '<label class="hint" for="tk-govde">Metin</label><textarea id="tk-govde" rows="10" maxlength="20000" required placeholder="Konuyu, sorunu ya da yazını anlat. Atlas kayıtlarına bağlantı için [[Spinoza]] gibi yazabilirsin."></textarea>' +
      '<p class="hint">Saygılı ol; kaynak gösterirsen başkaları da takip edebilir. Yazdıkların herkese açık olur.</p>' +
      '<p class="tk-hata" id="tk-form-hata" role="alert" hidden></p>' +
      '<button class="tk-dugme" type="submit">Konuyu aç</button> <a href="#topluluk">Vazgeç</a></form>');
    var f = el("tk-yeni-form");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var atlasMetin = el("tk-atlas").value.trim(), bulunan = null;
      if (atlasMetin) {
        bulunan = atlasBul(atlasMetin.replace(/\s*\((Filozof|Akım|Kavram)\)\s*$/, ""));
        if (!bulunan) { formHata("“" + atlasMetin + "” atlasta bulunamadı. Listeden seç ya da alanı boş bırak."); return; }
      }
      var kayit = { baslik: el("tk-baslik").value.trim(), govde: el("tk-govde").value.trim(), tur: el("tk-tur").value, atlas_id: bulunan ? bulunan.id : null, yazar_id: oturum.user.id };
      if (kayit.baslik.length < 3) { formHata("Başlık en az 3 harf olmalı."); return; }
      gonder(f, sb.from("konular").insert(kayit).select("id").single(), function (r) { location.hash = "topluluk-k-" + r.data.id; });
    });
  }

  function girisCiz(mod) {
    if (oturum) { location.hash = "topluluk"; return; }
    mod = mod || "giris";
    ciz(ust(mod === "giris" ? "Giriş yap" : "Kayıt ol", "") +
      '<p class="tk-giris">Okumak için giriş gerekmez. Yazmak için bir Helezon hesabı gerekir.</p>' +
      '<div class="filters" role="group" aria-label="Giriş ya da kayıt"><button class="chip" data-tk-mod="giris" aria-pressed="' + (mod === "giris") + '">Giriş yap</button><button class="chip" data-tk-mod="kayit" aria-pressed="' + (mod === "kayit") + '">Kayıt ol</button></div>' +
      '<form class="tk-form tk-dar" id="tk-giris-form">' +
      (mod === "kayit" ? '<label class="hint" for="tk-ad">Kullanıcı adı</label><input id="tk-ad" maxlength="40" required autocomplete="username">' : "") +
      '<label class="hint" for="tk-eposta">E-posta</label><input id="tk-eposta" type="email" required autocomplete="email">' +
      '<label class="hint" for="tk-sifre">Şifre</label><input id="tk-sifre" type="password" minlength="6" required autocomplete="' + (mod === "kayit" ? "new-password" : "current-password") + '">' +
      '<p class="tk-hata" id="tk-form-hata" role="alert" hidden></p>' +
      '<button class="tk-dugme" type="submit">' + (mod === "giris" ? "Giriş yap" : "Kayıt ol") + "</button>" +
      (mod === "giris" ? ' <button type="button" class="tk-bag" data-tk="unuttum">Şifremi unuttum</button>' : "") + "</form>");
    var f = el("tk-giris-form");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var eposta = el("tk-eposta").value.trim(), sifre = el("tk-sifre").value;
      if (mod === "giris") {
        gonder(f, sb.auth.signInWithPassword({ email: eposta, password: sifre }), function () {
          profilYukle().then(function () { location.hash = girisSonrasi || "topluluk"; girisSonrasi = ""; });
        });
        return;
      }
      var ad = el("tk-ad").value.trim();
      if (ad.length < 2) { formHata("Kullanıcı adı en az 2 harf olmalı."); return; }
      gonder(f, sb.from("profiller").select("id").ilike("kullanici_adi", ad.replace(/[%_\\]/g, "\\$&")).then(function (r) {
        if (r.data && r.data.length) return { error: { message: "__ad_alinmis" } };
        return sb.auth.signUp({
          email: eposta, password: sifre,
          options: { data: { kullanici_adi: ad }, emailRedirectTo: location.origin + location.pathname }
        });
      }), function (r) {
        if (r.data && r.data.session) { profilYukle().then(function () { location.hash = "topluluk"; }); return; }
        ciz(ust("Neredeyse tamam", "") + '<p class="tk-giris" style="margin-top:16px"><b>' + esc(eposta) + "</b> adresine bir onay bağlantısı gönderdik. Bağlantıya tıkladıktan sonra buradan giriş yapabilirsin.</p>" +
          '<p><a class="tk-dugme" href="#topluluk-giris">Giriş sayfasına git</a></p>');
      });
    });
  }
  var girisSonrasi = "";

  function unuttumCiz() {
    ciz(ust("Şifremi unuttum", "") +
      '<p class="tk-giris">Hesabının e-posta adresini yaz, şifreni yenilemen için bir bağlantı gönderelim.</p>' +
      '<form class="tk-form tk-dar" id="tk-unuttum-form"><label class="hint" for="tk-eposta">E-posta</label><input id="tk-eposta" type="email" required autocomplete="email">' +
      '<p class="tk-hata" id="tk-form-hata" role="alert" hidden></p><button class="tk-dugme" type="submit">Bağlantı gönder</button> <a href="#topluluk-giris">Vazgeç</a></form>');
    var f = el("tk-unuttum-form");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var eposta = el("tk-eposta").value.trim();
      gonder(f, sb.auth.resetPasswordForEmail(eposta, { redirectTo: location.origin + location.pathname }), function () {
        ciz(ust("E-postanı kontrol et", "") + '<p class="tk-giris" style="margin-top:16px">Bu adrese kayıtlı bir hesap varsa <b>' + esc(eposta) + "</b> adresine şifre yenileme bağlantısı gönderdik. Bağlantıya tıklayınca yeni şifreni belirleyebilirsin.</p>");
      });
    });
  }

  function sifreCiz() {
    if (!oturum) { ciz(ust("Yeni şifre", "") + '<p class="tk-giris" style="margin-top:16px">Bağlantının süresi dolmuş olabilir. <a href="#topluluk-giris">Giriş sayfasından</a> yeniden “Şifremi unuttum”u dene.</p>'); return; }
    ciz(ust("Yeni şifre belirle", "") +
      '<form class="tk-form tk-dar" id="tk-sifre-form"><label class="hint" for="tk-sifre">Yeni şifre</label><input id="tk-sifre" type="password" minlength="6" required autocomplete="new-password">' +
      '<p class="tk-hata" id="tk-form-hata" role="alert" hidden></p><button class="tk-dugme" type="submit">Şifreyi kaydet</button></form>');
    var f = el("tk-sifre-form");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      gonder(f, sb.auth.updateUser({ password: el("tk-sifre").value }), function () {
        ciz(ust("Şifren yenilendi", "") + '<p class="tk-giris" style="margin-top:16px">Artık yeni şifrenle giriş yapabilirsin. <a href="#topluluk">Konulara dön</a></p>');
      });
    });
  }

  function formHata(m) { var h = el("tk-form-hata"); if (h) { h.textContent = m; h.hidden = false; } }
  function gonder(form, istek, basari) {
    var d = form.querySelector("button[type=submit]");
    d.disabled = true;
    var h = el("tk-form-hata"); if (h) h.hidden = true;
    Promise.resolve(istek).then(function (r) {
      d.disabled = false;
      if (r && r.error) {
        formHata(r.error.message === "__ad_alinmis" ? "Bu kullanıcı adı alınmış, başka bir ad dene." : hataMetni(r.error));
        return;
      }
      basari(r);
    }, function (e) { d.disabled = false; formHata(hataMetni(e)); });
  }

  // ---------- Yönlendirme ----------
  function goster(h) {
    son = h;
    document.title = "Topluluk · Helezon";
    if (!HAZIR) { kurulmadi(); return; }
    if (!sb) bekle("");
    yukle().then(function () {
      if (son !== h) return;
      if (h === "topluluk-giris") girisCiz();
      else if (h === "topluluk-sifre") sifreCiz();
      else if (h === "topluluk-yeni" || h.indexOf("topluluk-yeni-") === 0) {
        if (!oturum) girisSonrasi = h;
        yeniCiz(h.slice(14) || null);
      }
      else if (h.indexOf("topluluk-k-") === 0) konuCiz(h.slice(11));
      else if (h.indexOf("topluluk-kayit-") === 0) listeCiz(h.slice(15));
      else listeCiz(null);
    }, cevrimdisi);
  }
  function yenidenCiz() { if (son && document.body.classList.contains("topluluk-modu")) goster(son); }

  function olaylar() {
    c.main.addEventListener("click", function (e) {
      if (!document.body.classList.contains("topluluk-modu")) return;
      var t = e.target.closest("[data-tk], [data-tk-tur], [data-tk-sil], [data-tk-mod]");
      if (!t) return;
      e.preventDefault();
      var a = t.getAttribute("data-tk");
      if (a === "cikis") { sb.auth.signOut().then(function () { oturum = null; profil = null; yenidenCiz(); }); return; }
      if (a === "unuttum") { unuttumCiz(); return; }
      if (a === "yenile") { yukleme = null; goster(son); return; }
      if (a === "daha") { liste.adet += SAYFA; goster(son); return; }
      if (t.hasAttribute("data-tk-mod")) { girisCiz(t.getAttribute("data-tk-mod")); return; }
      if (t.hasAttribute("data-tk-tur")) { liste.tur = t.getAttribute("data-tk-tur"); liste.adet = SAYFA; goster(son); return; }
      var sil = t.getAttribute("data-tk-sil");
      if (sil) {
        var p = sil.split(":"), tablo = p[0] === "konu" ? "konular" : "yanitlar";
        if (!window.confirm(p[0] === "konu" ? "Bu konu ve tüm yanıtları silinsin mi?" : "Bu yanıt silinsin mi?")) return;
        sb.from(tablo).delete().eq("id", p[1]).then(function (r) {
          if (r.error) { window.alert(hataMetni(r.error)); return; }
          if (p[0] === "konu") location.hash = "topluluk"; else goster(son);
        });
      }
    });
    var zaman;
    c.main.addEventListener("input", function (e) {
      if (e.target.id !== "tk-ara") return;
      clearTimeout(zaman);
      zaman = setTimeout(function () { liste.q = e.target.value; liste.adet = SAYFA; liste._odak = true; goster(son); }, 300);
    });
  }

  window.Topluluk = {
    hazir: HAZIR,
    baslat: function (baglam) { c = baglam; olaylar(); },
    goster: goster,
    sayac: sayac,
    // E-posta onayından dönen #access_token=... adresini yakalamak için kütüphaneyi hemen yükler.
    oturumuYakala: function () { if (HAZIR) return yukle(); return Promise.resolve(); }
  };
})();
