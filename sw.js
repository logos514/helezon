// Helezon servis çalışanı: uygulamayı ve veriyi önbelleğe alıp çevrimdışı açar.
// Veri ya da arayüz değiştiğinde SURUM'u artırın; eski önbellek silinir.
const SURUM = "helezon-v1";
const TEMEL = [
  "./",
  "index.html",
  "veri.json",
  "manifest.webmanifest",
  "simgeler/simge.svg",
  "simgeler/simge-192.png",
  "simgeler/simge-512.png",
  "simgeler/apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SURUM).then((c) => c.addAll(TEMEL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((adlar) => Promise.all(adlar.filter((a) => a !== SURUM).map((a) => caches.delete(a))))
      .then(() => self.clients.claim())
  );
});

// Önce önbellekten yanıt ver, arka planda ağdan tazele (yazı tipleri dahil).
self.addEventListener("fetch", (e) => {
  const istek = e.request;
  if (istek.method !== "GET") return;
  const url = new URL(istek.url);
  const kendi = url.origin === self.location.origin;
  const yaziTipi = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!kendi && !yaziTipi) return;

  e.respondWith(
    caches.open(SURUM).then((onbellek) =>
      onbellek.match(istek, { ignoreSearch: kendi }).then((kayitli) => {
        const ag = fetch(istek)
          .then((yanit) => {
            if (yanit && (yanit.ok || yanit.type === "opaque")) onbellek.put(istek, yanit.clone());
            return yanit;
          })
          .catch(() => kayitli || (istek.mode === "navigate" ? onbellek.match("index.html") : undefined));
        return kayitli || ag;
      })
    )
  );
});
