import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Gizlilik" };

// Sorular ve veri silme talepleri için iletişim adresi
const CONTACT_EMAIL = "dilmacoguz33@gmail.com";

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "Kim işletiyor?",
    body: [
      "Bu site, HSD İnönü (Huawei Student Developers, İnönü Üniversitesi) topluluğunun düzenlediği yapay zekâ müzik yarışması için yapıldı ve topluluk tarafından işletiliyor.",
    ],
  },
  {
    title: "Hangi bilgileri topluyoruz?",
    body: [
      "Google ile giriş yaptığında Google'ın bizimle paylaştığı adın, e-posta adresin ve profil fotoğrafın. Google hesabının şifresini hiçbir zaman görmüyoruz.",
      "Başvuru yaparsan gönderdiğin şarkı dosyası, kapak görseli ve formda yazdıkların: şarkı adı, sanatçı adı, tür, kullandığın yapay zekâ araçları ve şarkıyı nasıl ürettiğine dair notun.",
      "Oy verirsen hangi finaliste oy verdiğin. Jüri üyesiysen şarkılara verdiğin puanlar ve notların.",
    ],
  },
  {
    title: "Bilgileri ne için kullanıyoruz?",
    body: [
      "Yalnızca yarışmayı yürütmek için: başvuruları almak, jürinin değerlendirmesini sağlamak, oylamayı yapmak ve sonuçları açıklamak. Bilgilerini satmıyor, reklam için kullanmıyor ve yarışma dışında kimseyle paylaşmıyoruz.",
    ],
  },
  {
    title: "Kim neyi görür?",
    body: [
      "Başvurular jüri değerlendirmesi boyunca yalnızca jüriye ve yarışma ekibine açıktır. Jüri, kör değerlendirme açıkken sanatçı adını görmez.",
      "Finale kalan şarkılar, oylama başlayınca şarkı adı, sanatçı adı, kapak görseli ve dosyasıyla birlikte herkese açılır. Finale kalmayan şarkılar hiçbir zaman herkese açılmaz.",
      "E-posta adresini yalnızca yarışma ekibi görür. Kimin kime oy verdiğini başka bir kullanıcı göremez.",
    ],
  },
  {
    title: "Bilgiler nerede saklanıyor?",
    body: [
      "Veriler Supabase altyapısında, Avrupa'daki sunucularda saklanır. Site Vercel üzerinden yayınlanır. Yarışma bittikten sonra başvuruları ve dosyaları en geç bir yıl içinde sileriz.",
    ],
  },
  {
    title: "Hakların",
    body: [
      "Başvuru aşaması sürerken başvurunu Başvurum sayfasından kendin geri çekebilirsin; şarkı dosyan ve kapağın da silinir.",
      `Hesabının ve tüm bilgilerinin silinmesini istersen ya da sorun varsa ${CONTACT_EMAIL} adresine yaz.`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <PageShell title="Gizlilik" lead="Hangi bilgileri neden topladığımızı kısaca anlatıyoruz." narrow>
      <div className="space-y-10">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="display text-3xl">{s.title}</h2>
            <div className="mt-3 max-w-prose space-y-3 text-lg">
              {s.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        ))}
        <p className="text-sm text-ink-soft">Son güncelleme: 16 Ekim 2026</p>
      </div>
    </PageShell>
  );
}
