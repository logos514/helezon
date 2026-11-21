// claude.ai artifact sürümü için index.html'den gövde parçası üretir (yayın aracı belge iskeletini kendisi ekler).
// Kullanım: node src/artifact.js <çıktı-klasörü>
const fs = require("fs");
const path = require("path");
const kok = path.join(__dirname, "..");
const hedef = process.argv[2];
if (!hedef) { console.error("Çıktı klasörü verin."); process.exit(1); }
let s = fs.readFileSync(path.join(kok, "index.html"), "utf8");
const head = s.slice(s.indexOf("<head>") + 6, s.indexOf("</head>"));
const body = s.slice(s.indexOf("<body>") + 6, s.lastIndexOf("</body>"));
const parca = head
  .split("\n")
  .filter((l) => !/<meta (charset|name="viewport"|name="theme-color"|name="apple|name="mobile)|rel="manifest"|rel="icon"|rel="apple-touch-icon"/.test(l))
  .join("\n")
  .replace(/:root \{ padding-top: env\(safe-area-inset-top, 0px\); padding-bottom: env\(safe-area-inset-bottom, 0px\); \}\n/, "")
  .trim();
fs.mkdirSync(hedef, { recursive: true });
fs.writeFileSync(path.join(hedef, "index.html"), parca + "\n" + body.trim() + "\n");
fs.copyFileSync(path.join(kok, "veri.json"), path.join(hedef, "veri.json"));
console.log("Artifact dosyaları yazıldı:", hedef);
