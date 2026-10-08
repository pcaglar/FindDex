# FindDex — Agent Kuralları

## Mimari ve veri akışı

- Self-hosted, tek kullanıcılı Next.js 14 App Router + React + TypeScript (strict) uygulaması; Tailwind CSS kullanır.
- `src/app/`: ana arşiv, `settings/` ve `stats/` sayfaları. `src/components/`: kart/liste, profil formu, galeri, filtreler, çöp kutusu ve modallar.
- `src/app/api/`: profil CRUD/sayfalama/aktivite/tekrar kontrolü; platform, etiket, koleksiyon, istatistik, çöp kutusu, ayarlar, bakım, yedek ve JSON/ZIP aktarım rotaları.
- `src/lib/`: `profileService.ts` iş kuralları ve ilişkiler; `prisma.ts` ortak Prisma istemcisi; görsel depolama, aktarım, yedekleme ve bakım yardımcıları. Bazı API rotaları doğrudan Prisma kullanır. `src/types/` ortak veri tiplerini tutar.
- Akış: istemci bileşenleri → HTTP `/api/*` → servis/Prisma → SQLite → JSON yanıtı → arayüz. Silme önce `deletedAt` ile çöp kutusuna taşır; kalıcı silme ayrı işlemdir.
- `prisma/schema.prisma` veri modelini, `prisma/migrations/` sürümlü SQL değişikliklerini tanımlar. `prisma/seed.ts` demo verisidir; demo yükleme mevcut profil verilerini siler.
- `src/i18n/` + `locales/`: i18next, dil tercihi ve yerel biçimlendirme. Dil/tema/görünüm tercihleri tarayıcıda, uygulama ayarları SQLite'ta saklanır.
- `finddex-instagram-extension/`: Manifest V3 Chrome eklentisi; Instagram DOM'undan veri çıkarır, Bearer API anahtarıyla `/api/external/profiles` rotasına gönderir.
- `scripts/`: Docker SQLite hazırlığı/baseline, yedek zamanlayıcısı, eski JSON→SQLite aktarımı, eklenti CDP testleri ve ikon üretimi. `src/lib/db.ts` ve `data/vault.json` eski JSON katmanıdır; yeni işlevler Prisma kullanmalıdır.
- Docker tek `app` servisi çalıştırır: entrypoint izinleri ayarlar, SQLite'ı hazırlar, `prisma migrate deploy` uygular, yedek zamanlayıcısını ve Next.js'i başlatır. Veritabanı `/app/data/dev.db`, yedekler `/app/data/backups`, görseller `/app/public/uploads` altındadır.

## Çalıştırma ve kontroller

İlk kurulumda `.env.example` dosyasını `.env` olarak kopyala; mevcut `.env` dosyasını ezme.

| İşlem | Docker | Docker'sız (Node.js 20 + npm) |
| --- | --- | --- |
| Kurulum | `cp .env.example .env` | `cp .env.example .env`, `npm ci`, `npx prisma generate`, `npx prisma migrate dev` |
| Çalıştırma | `docker compose up -d --build` → `http://localhost:12000` (veya `APP_PORT`) | `npm run dev` → `http://localhost:3000` |
| Build | `docker compose build app` | `npm run build` |
| Production | `docker compose up -d` | `npm run start` (önce build) |
| Lint | Dev bağımlılıklarını içeren `builder` aşamasında aşağıdaki komutlar | `npm run lint` |
| Kontrol | `docker compose ps`, `docker compose logs --tail=100 app` | Çalışan sunucuda arayüz/API kontrolü |

- Docker'sız kullanımda `.env` içindeki Docker'a özgü `UPLOADS_DIR` ve `BACKUPS_DIR` değerlerini repo içindeki `public/uploads` ve `data/backups` mutlak yollarına ayarla veya kaldır; varsayılanlar bu klasörlerdir. `DATABASE_URL=file:./dev.db?connection_limit=1&socket_timeout=30` Prisma klasörüne göredir.
- Docker içinde lint için: `docker build --target builder -t finddex-check .`, ardından `docker run --rm finddex-check npm run lint`. Mevcut repoda ESLint bağımlılıkları/yapılandırması yok; `npm run lint` hazır ve doğrulanmış bir kontrol değildir. Production image dev araçlarını içermez.
- `npm test` ve genel unit/integration test altyapısı yok. Eklenti kontrolleri: `python3 scripts/test-extension-cdp.py "$FINDDEX_TEST_API_KEY"` ve `python3 scripts/test-instagram-extraction-cdp.py "$FINDDEX_TEST_API_KEY"`. Python `websockets`, Chrome CDP `127.0.0.1:9223`, açık Instagram sekmesi ve `localhost:12000` sunucusu gerekir; ikinci betik `/instagram/` profilini bekler. Betikler kayıt ekler; test verisi/anahtarı kullan.
- Her değişiklikten sonra **`docker compose up -d --build`** çalıştır; durum/logları ve etkilenen akışı kontrol et. İki dilde profil oluşturma/düzenleme, görsel yükleme ve ilgili ekranları dene. Ortam engelinde başarısız komutu ve nedeni bildir; çalışmayan kontrolü başarılı sayma.
- `npm run dev` yedek zamanlayıcısını başlatmaz. Gerekirse ayrı terminalde `node scripts/backup-scheduler.mjs` çalıştır; production'da entrypoint başlatır. Otomatik JSON yedekleri ayarlardan etkinleştirilir; görsel dosyalarını içermez, görseller için ZIP export kullanılır.

## Kodlama kuralları

- UI metinlerini **yalnızca `locales/en.json` ve `locales/tr.json`** içine yaz; İngilizce kaynak dildir, iki dosyada aynı anahtarları koru. Bileşenlerde `t(...)` kullan; yeni inline çeviri sözlükleri veya hardcoded kullanıcı mesajları ekleme. Eklentideki mevcut inline sözlükler bu kurala uyum açısından teknik borçtur.
- Tarih ve sayı gösteriminde `Intl.DateTimeFormat` / `Intl.NumberFormat` kullan; `src/i18n/format.ts` yardımcılarını tercih et. Veri/API tarihleri ISO biçiminde kalır.
- TypeScript strict ve `@/*` → `src/*` alias'ını koru. Veritabanı/dosya sistemi işlemlerini sunucuda tut; istemci bileşenleri API üzerinden erişsin.

## Uyumluluk ve güvenlik

- **Prisma model isimlerini**, eski Docker volume isimlerini **`modelvault_data`, `modelvault_uploads`** ve **`MODELVAULT_*` env değişkenlerini migration planı olmadan değiştirme.** Şema değişikliklerini yeni migration ile yap; uygulanmış migration geçmişini yeniden yazma.
- `.env`, `prisma/dev.db` (journal/WAL/SHM dahil), `public/uploads` içindeki kullanıcı dosyaları ve `data/backups` **asla commit edilmez**. `.env.example` ve boş dizin işaretçisi `.gitkeep` hariçtir. Commit öncesi staged dosyaları kontrol et; mevcut repoda `.gitignore` yok ve `prisma/dev.db` zaten takip ediliyor.
- API anahtarlarını kodda, fixture'larda veya loglarda hardcode etme/yayımlama. Dış istemci rotasının Bearer doğrulamasını koru. Uygulamanın dahili API'lerinde kullanıcı girişi yok; internet erişimi ters proxy/VPN gibi bir erişim katmanı gerektirir.
- Veri/volume silme, reset, demo yükleme ve replace import işlemlerinden önce yedek/migration planı gerekir. Kalıcı veriyi silen `docker compose down -v` komutunu rutin kontrol için kullanma.

## Görsel yükleme

- Harici URL'den yeni eklenen/düzenlenen profil görsellerini sunucuda `src/lib/remoteImage.ts` ile indir, `imageStorage.ts` ile `UPLOADS_DIR` altında sakla; veritabanına **`/api/uploads/<filename>`** URL'sini yaz. Bu URL sunum rotasıdır, fiziksel dizin değildir.
- Dosya yükleme `/api/upload` POST rotasını kullanır; `/api/uploads/[filename]` GET/HEAD dosyaları sunar. Eski `/uploads/*` adresleri Next.js rewrite ile desteklenir.
- HTTP/HTTPS, 15 saniye indirme zaman aşımı, 5 MB sınırı, JPG/PNG/WEBP MIME ve dosya imzası kontrollerini, güvenli dosya adı ve başarısız kayıt sonrası indirilen dosyaların temizlenmesini koru.
- Eski/import edilmiş kayıtlar ve demo görselleri harici URL içerebilir; yeni profil yükleme akışında uzak URL'yi kalıcı görsel adresi olarak bırakma.
