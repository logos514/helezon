// Topluluk alanının bağlandığı Supabase projesi (Agora ile aynı proje).
// Değerler Supabase panelinde: Project Settings → API → "Project URL" ve "anon public" anahtarı.
// "anon" anahtarı tarayıcıda görünmek üzere tasarlanmıştır; güvenliği veritabanındaki kurallar (RLS) sağlar.
// Boş kalırsa akademik taraf çalışmaya devam eder, Topluluk sekmesi "henüz bağlanmadı" der.
window.HELEZON_TOPLULUK = {
  url: "",
  anahtar: ""
};
