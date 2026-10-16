# Online Müzik Yarışması

Topluluklar için online müzik yarışması sitesi. Katılımcılar şarkılarını ve kapak görsellerini yükler. Jüri her şarkıyı kriterlere göre puanlar, yönetici puan sıralamasına bakarak finalistleri seçer. Finalistler herkese açılır ve kazananı giriş yapan herkesin oyu belirler.

**Yarışmanın aşamaları:** Başvuru → Jüri değerlendirmesi → Final oylaması → Sonuçlar. Aşamaları yönetim panelinden tek tıkla değiştirirsin.

## Neler var?

**Katılımcılar için**
- Google ile tek tıkla giriş, şifre yok.
- Şarkı (MP3/M4A) ve kapak görseli yükleme. İlerleme çubuğu, dosya kontrolü ve önizleme var.
- **Başvurum** sayfası: durum takibi; başvurular kapanana kadar geri çekip yeniden gönderme.
- Finalistlere özel paylaşılabilir şarkı sayfası. Instagram'da ve WhatsApp'ta kapak görseliyle önizleme çıkar.

**Dinleyiciler için**
- Sayfalar arasında gezerken çalmaya devam eden ortak oynatıcı.
- Kişi başı tek oy; oylama bitene kadar oy başka şarkıya taşınabilir.
- Oylama sürerken oy sayıları gizli kalır, bu yüzden "en çok oy alana yığılma" olmaz. Sonuçlar aşamasında sıralama açılır.

**Jüri için**
- Puanlama ekranı: şarkıyı dinle, her kritere 1–10 puan ver, istersen not düş, "Kaydet ve sıradakine geç".
- Kör değerlendirme (açılıp kapatılabilir): jüri sanatçı adını görmez, şarkılar "Eser 01, Eser 02" diye sıralanır.
- Kaç şarkıyı puanladığını gösteren ilerleme çubuğu. Telefondan da rahat kullanılır.
- Jüri üyeleri birbirinin puanını göremez; kendi şarkısını puanlayamaz. Puanlama yalnızca değerlendirme aşamasında açıktır.

**Yönetim ekibi için**
- Aşama değiştirme, yarışma adı, tanıtım metni, kurallar ve tarihler.
- Değerlendirme kriterlerini ekleme, düzenleme ve ağırlıklandırma (varsayılan: özgünlük, prodüksiyon, icra, söz ve kompozisyon, kapak görseli).
- Başvuruları jüri ortalamasına göre sıralı görme; her şarkının kriter ortalamaları ve kaç jüriden puan aldığı. Jüri üyelerinin ilerlemesini takip etme.
- Tüm başvuruları dinleme. Finale alma, yarışma dışı bırakma ve silme.
- Jüri ve yönetici ekleme. Kişi henüz giriş yapmamış olsa bile e-postasıyla davet edilebilir.
- Oylama sırasında canlı oy sayıları ve Excel'de açılan CSV dışa aktarımı (jüri puanları dahil).

**Jüri puanı nasıl hesaplanır?** Her jüri üyesinin bir şarkıya verdiği puanların kriter ağırlıklı ortalaması alınır, sonra bu ortalamaların tüm jüri üyeleri üzerinden ortalaması alınır. Ağırlığı 0,5 olan kriter, ağırlığı 1 olanın yarısı kadar etkiler.

**Güvenlik:** Tüm kurallar veritabanı seviyesinde (Supabase RLS) uygulanır, bu yüzden arayüz atlatılsa bile kurallar geçerlidir:
- Kimse kendini yönetici ya da finalist yapamaz.
- Kimse başkası adına oy veremez.
- Finale kalmayan şarkılar hiçbir aşamada herkese açılmaz.
- Oylama kapanınca oylar değiştirilemez.
- Jüri puanları yalnızca değerlendirme aşamasında, yalnızca jüri tarafından, 1–10 arası tam sayı olarak yazılabilir; jüri sadece kendi puanlarını, yönetici hepsini görür.

Bunların hepsi `npm run test:db` ile gerçek bir Postgres üzerinde test edilir (48 test).

> Kör değerlendirme arayüz düzeyindedir: jüri ekranında sanatçı adları gizlenir. Teknik bilgisi olan bir jüri üyesi veritabanı isteklerinde adları görebilir; topluluk yarışması için bu yeterli bir önlemdir.

---

## 1. Önce bir bak: önizleme modu (kurulum gerektirmez)

```bash
npm install
npm run dev
```

http://localhost:3000 adresini aç. Supabase bağlı olmadığı için site örnek verilerle çalışır. Üstteki koyu şeritten aşamayı değiştirerek her ekranı görebilirsin. Önizlemede hiçbir şey kaydedilmez; şarkılar yerine tarayıcıda üretilen kısa melodiler çalar.

> Node.js 20.9 veya üstü gerekir: `node --version`

---

## 2. Gerçek kurulum (yaklaşık 20 dakika)

### Adım 1: Supabase projesi

1. [supabase.com](https://supabase.com) → **New project**. Bölge olarak **Frankfurt (eu-central-1)** Türkiye'ye en yakın olanı.
2. Sol menü → **SQL Editor** → **New query**.
3. Bu depodaki `supabase/schema.sql` dosyasının tamamını yapıştır.
4. **Çalıştırmadan önce** dosyadaki `ornek@gmail.com` adresini kendi Google adresinle değiştir. Bu adresle ilk giriş yaptığında otomatik yönetici olursun.
5. **Run**. "Success" görmelisin. Dosya tekrar çalıştırılabilir, verileri silmez.
6. **Project Settings → API Keys** bölümünden iki değeri kopyala:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **Publishable key** (`sb_publishable_...`). Eski projelerde bunun yerine "anon public" anahtarı olur, o da çalışır.

### Adım 2: Google ile giriş

1. [console.cloud.google.com](https://console.cloud.google.com) → yeni bir proje oluştur.
2. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - Uygulama adı: yarışmanın adı; destek e-postası: senin adresin
   - Kaydettikten sonra **Publish app** ile yayına al. Test modunda yalnızca listeye eklediğin kişiler giriş yapabilir. Yalnızca ad, e-posta ve profil fotoğrafı istendiği için Google'ın ek doğrulaması gerekmez.
3. **Credentials → Create credentials → OAuth client ID → Web application**
   - **Authorized redirect URIs:** `https://xxxx.supabase.co/auth/v1/callback`. Tam adresi Supabase'deki Google ayar sayfasında "Callback URL" olarak görürsün.
4. Çıkan **Client ID** ve **Client secret** değerlerini Supabase'e gir: **Authentication → Sign In / Providers → Google** → etkinleştir → yapıştır → kaydet.
5. Supabase **Authentication → URL Configuration**
   - **Site URL:** sitenin adresi (yayına aldıktan sonra Vercel adresi; şimdilik `http://localhost:3000`)
   - **Redirect URLs:** `http://localhost:3000/**` ve sonradan `https://SITE-ADRESIN/**`

### Adım 3: Bilgisayarında çalıştır

`.env.example` dosyasını `.env.local` adıyla kopyalayıp doldur:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

`npm run dev` ile başlat ve **Giriş yap** → Google ile gir. Menüde **Yönetim** görünüyorsa her şey doğru kuruldu.

> "Veritabanına ulaşılamadı" uyarısı görürsen `schema.sql` çalışmamış ya da anahtarlar yanlış demektir.
> Girişten sonra Yönetim görünmüyorsa SQL Editor'de şunu çalıştır:
> `update public.profiles set role = 'admin' where email = 'senin@gmail.com';`

### Adım 4: Vercel'e yayınla (ücretsiz)

1. Projeyi GitHub'a gönder.
2. [vercel.com](https://vercel.com) → **Add New → Project** → depoyu seç.
3. **Environment Variables** bölümüne `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` değerlerini ekle → **Deploy**.
4. Çıkan adresi (ör. `https://muzik-yarismasi.vercel.app`) Supabase'de **Site URL** ve **Redirect URLs** listesine ekle.
5. Kendi alan adını bağlarsan `NEXT_PUBLIC_SITE_URL` değişkenine onu yaz ve Supabase'deki adresleri güncelle.

---

## 3. Yarışmayı yönetmek

| Ne zaman | Ne yapıyorsun |
| --- | --- |
| Başlamadan önce | **Yönetim → Yarışma**: adı, sloganı, tanıtım metnini, kuralları, tarihleri ve değerlendirme kriterlerini yaz. **Ekip** sekmesinden jüri üyelerinin Google adreslerini ekle. |
| Başvuru dönemi | Aşama **Başvuru**. Duyuru postunda ana sayfanın linkini paylaş. Kurallara uymayanları **Başvurular**'dan **Yarışma dışı bırak**; bunlar jüriye gösterilmez. |
| Son gün dolunca | Aşamayı **Jüri değerlendirmesi**ne al. Yeni başvuru ve dosya yükleme kapanır, jürinin puanlama ekranı açılır. |
| Jüri puanlarken | Jüri üyeleri giriş yapınca doğrudan **Puanla** ekranına gelir. Sen **Yarışma** sekmesinden kimin kaç şarkıyı puanladığını takip edersin. |
| Finalistleri seçerken | **Başvurular** listesi jüri ortalamasına göre sıralıdır. Kriter ortalamalarına bakıp istediklerini **Finale al**. |
| Final | Aşamayı **Final oylaması**na al. Finalistler herkese açılır. Finalistler kendi şarkı sayfalarını paylaşıp oy toplar. Canlı oy sayılarını yalnızca yöneticiler görür. |
| Bitiş | Aşamayı **Sonuçlar**a al. Oylama kapanır, sıralama ve oy sayıları ana sayfada yayınlanır. |

Tarih alanları bilgi amaçlıdır. Başvuruları ve oylamayı otomatik kapatmazlar; aşamayı sen değiştirirsin. Böylece süre uzatmak tek tıklık bir iş.

---

## 4. Ücretsiz plan sınırları (önemli)

Supabase'in ücretsiz planı yazıldığı tarihte yaklaşık **1 GB dosya depolama** ve **aylık 5 GB veri çıkışı** veriyordu. Güncel değerler için [supabase.com/pricing](https://supabase.com/pricing) sayfasına bak. Bu yarışma için anlamı şu:

- **Depolama:** Şarkı başına en fazla 10 MB olduğundan ücretsiz plan kabaca 100 başvuruyu kaldırır.
- **Veri çıkışı:** Asıl sınır bu. Oylamada her tam dinleme şarkının boyutu kadar veri harcar. 6 MB'lık bir şarkı aylık 5 GB ile yaklaşık 800 kez baştan sona dinlenebilir. Çok katılımlı bir oylama bekliyorsan:
  - katılımcılardan şarkıyı **192 kbps MP3** olarak göndermelerini iste (4 dakikalık şarkı ≈ 6 MB), ya da
  - oylamanın olduğu ay için Supabase'i Pro plana geçir, oylama bitince geri al.
  - Kullanımı **Supabase → Organization → Usage** sayfasından takip edebilirsin.
- **Uyku modu:** Ücretsiz projeler bir hafta hiç kullanılmazsa uyku moduna geçer. Yarışma başlamadan önce panelden tek tıkla uyandırabilirsin.

Vercel'in ücretsiz (Hobby) planı ticari olmayan projeler içindir; topluluk yarışması için uygundur. Şarkılar Vercel üzerinden değil, doğrudan Supabase'den yüklenip dinlenir.

---

## 5. Geliştiriciler için

```bash
npm run dev        # geliştirme sunucusu
npm run build      # üretim derlemesi
npm run typecheck  # TypeScript kontrolü
npm run test:db    # veritabanı güvenlik kuralları testleri (internet gerekmez)
```

- **Yığın:** Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS 4, Supabase (Auth, Postgres, Storage)
- **Yapı:**
  - `src/app` sayfalar
  - `src/lib/data.ts` veri okuma
  - `src/lib/actions.ts` ve `admin-actions.ts` sunucu işlemleri
  - `src/components/jury/jury-board.tsx` jüri puanlama ekranı
  - `supabase/schema.sql` veritabanı ve güvenlik kuralları
- **Dosya yükleme:** Dosyalar tarayıcıdan doğrudan Supabase Storage'a gider; sunucudan geçmez. Ses dosyaları gizli kovadadır ve dinleme izni olanlara 3 saatlik süreli bağlantıyla verilir. Kapaklar herkese açık kovada, tahmin edilemez adreslerdedir.
- **Önizleme modu:** Ortam değişkenleri boşken `src/lib/demo.ts` içindeki örnek verilerle çalışır.

## Lisans

MIT
