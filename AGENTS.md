# FindDex — Agent Kuralları

## Mimari ve veri akışı

- Self-hosted, tek kullanıcılı Next.js 14 App Router + React + TypeScript (strict) + Tailwind uygulaması; Prisma üzerinden SQLite kullanır.
- `src/app/`: ana arşiv, `settings/`, `stats/`; `src/components/`: profil formu, kart/liste, galeri, filtreler, çöp kutusu ve modallar.
- `src/app/api/`: profil CRUD/sayfalama/aktivite/tekrar kontrolü, platform/etiket/koleksiyon, istatistik, ayarlar, bakım, yedek ve JSON/ZIP aktarım rotaları.
- `src/lib/profileService.ts`: profil iş kuralları ve ilişkiler; `prisma.ts`: ortak istemci. Diğer yardımcılar görsel, aktarım, yedek ve bakım işlemlerini yönetir; bazı rotalar doğrudan Prisma kullanır. `src/types/` ortak tipleri tutar.
- Akış: istemci bileşenleri → HTTP `/api/*` → servis/Prisma → SQLite → JSON → arayüz. Silme önce `deletedAt` ile çöp kutusuna taşır; kalıcı silme ayrıdır.
- `prisma/schema.prisma` modeli, `prisma/migrations/` sürümlü SQL'i, `systemDefaults.ts` sistem kayıtlarını, `seed.ts` demo verisini tanımlar. `src/lib/db.ts` ve `data/vault.json` eski JSON katmanıdır; yeni işlevler Prisma kullanır.
- `src/i18n/` + `locales/`: i18next ve yerel biçimlendirme. Dil/tema/görünüm tercihleri tarayıcıda, uygulama ayarları SQLite'tadır.
- `finddex-instagram-extension/`: Manifest V3 Chrome eklentisi; Instagram DOM verisini Bearer anahtarıyla `/api/external/profiles` rotasına gönderir. `scripts/`: SQLite hazırlığı/baseline, yedek zamanlayıcısı, eski JSON aktarımı, testler, ikon üretimi ve Telegram worker/kurulum yardımcısı.
- Docker varsayılan olarak `app` servisini çalıştırır. Entrypoint izinleri/SQLite'ı hazırlar, `prisma migrate deploy` uygular, yedek zamanlayıcısını ve Next.js'i başlatır. Kalıcı yollar: `/app/data/dev.db`, `/app/data/backups`, `/app/public/uploads`.
- İsteğe bağlı `telegram` Compose profili `telegram-bot` worker'ını başlatır. Long polling → izinli özel sohbet → Bearer `/api/external/instagram` → `instagramImport.ts` → scraper → yerel görseller/SQLite. Aynı gönderi aktivite ID'siyle tekrar eklenmez; başka gönderiler mevcut galeriye eklenir. Mesaj sırası ayrı `telegram_bot_state` volume'ündedir.

## Çalıştırma ve kontroller

İlk kurulumda `cp .env.example .env`; mevcut `.env` dosyasını ezme.

| İşlem | Docker | Docker'sız (Node.js 20 + npm) |
| --- | --- | --- |
| Kurulum/çalıştırma | `docker compose up -d --build` → `localhost:12000` (`APP_PORT`) | `npm ci`, `npx prisma generate`, `npx prisma migrate dev`, `npm run dev` → `localhost:3000` |
| Build | `docker compose build app` | `npm run build` |
| Production | `docker compose up -d` | Build sonrası `npm run start` |
| Lint | Builder image içinde `npm run lint` | `npm run lint` |
| Sistem testi | Builder image içinde `npx tsx scripts/test-system-defaults.ts` | `npx tsx scripts/test-system-defaults.ts` |
| Durum/log | `docker compose ps`, `docker compose logs --tail=100 app` | Çalışan sunucuda arayüz/API kontrolü |

- Builder kontrolleri için `docker build --target builder -t finddex-check .`, ardından `docker run --rm finddex-check npm run lint` veya `docker run --rm finddex-check npx tsx scripts/test-system-defaults.ts`. Production image geliştirme araçlarını içermez.
- Lint betiği tanımlı, ancak ESLint bağımlılığı/yapılandırması yok; hazır bir kontrol sayma. `npm test` yok; sistem testi geçici SQLite/upload dizinlerinde migration/reset varsayılanlarını kontrol eder. `npm run test:telegram` bot yetkilendirmesini ve API/galeri aktarımını geçici verilerle test eder; Docker'da `docker run --rm finddex-check npm run test:telegram` kullan.
- Bot kurulumu: `npm run telegram:setup` (Node.js 20.6+); `.env` içinde bot tokenı, kullanıcı ID'si, scraper URL'si ve FindDex API anahtarı; çalıştırma `docker compose --profile telegram up -d --build` veya `npm run telegram:bot`. Boş kullanıcı ID'sinde `/whoami` çalışır, kayıt kapalıdır. Ayrıntılar README'dedir.
- Eklenti testleri: `python3 scripts/test-extension-cdp.py "$FINDDEX_TEST_API_KEY"` ve `python3 scripts/test-instagram-extraction-cdp.py "$FINDDEX_TEST_API_KEY"`. Python `websockets`, Chrome CDP `127.0.0.1:9223`, eklenti, açık Instagram sekmesi ve `localhost:12000` gerekir; ikinci betik `/instagram/` sayfasını bekler. Kayıt ekledikleri için test verisi/anahtarı kullan.
- Docker'sız `.env` içindeki `UPLOADS_DIR` ve `BACKUPS_DIR` değerlerini repo içindeki `public/uploads` ve `data/backups` mutlak yollarına ayarla veya kaldır. `DATABASE_URL=file:./dev.db?connection_limit=1&socket_timeout=30` Prisma klasörüne göredir.
- `npm run dev`/`npm run start` yedek zamanlayıcısını başlatmaz; gerekirse ayrıca `node scripts/backup-scheduler.mjs` çalıştır. Otomatik JSON yedekleri görsel dosyalarını içermez; görseller için ZIP export kullan.
- **Her değişiklikten sonra `docker compose up -d --build` çalıştır**, durum/logları ve etkilenen akışı kontrol et. UI değişikliklerinde iki dilde ilgili ekranları, profil oluşturma/düzenleme ve görsel yüklemeyi dene. Ortam engelinde başarısız komutu ve nedeni bildir; çalışmayan kontrolü başarılı sayma.

## Kodlama kuralları

- UI metinlerini **yalnızca `locales/en.json` ve `locales/tr.json`** içine yaz; İngilizce kaynak dildir, anahtarlar aynı kalır. Bileşenlerde `t(...)` kullan; inline sözlük veya hardcoded UI mesajı ekleme. Eklentinin mevcut inline sözlükleri teknik borçtur.
- Tarih/sayı gösteriminde `Intl.DateTimeFormat` / `Intl.NumberFormat`, tercihen `src/i18n/format.ts` yardımcılarını kullan. API tarihleri ISO kalır.
- TypeScript strict ve `@/*` → `src/*` alias'ını koru; veritabanı/dosya sistemi sunucuda, istemci erişimi API üzerinden kalır.

## Uyumluluk ve güvenlik

- **Prisma model isimlerini, `modelvault_data`, `modelvault_uploads` volume isimlerini ve `MODELVAULT_*` env değişkenlerini migration planı olmadan değiştirme.** Şema değişikliğine yeni migration ekle; uygulanmış migration geçmişini yeniden yazma.
- **`.env`, `prisma/dev.db` (journal/WAL/SHM dahil), `public/uploads` kullanıcı dosyaları ve `data/backups` asla commit edilmez.** `.env.example` ve boş dizin işaretçisi `.gitkeep` hariçtir. `.gitignore` kurallarını ve commit öncesi staged dosyaları kontrol et.
- API anahtarlarını kodda/fixture/loglarda hardcode etme veya yayımlama; dış API'nin Bearer doğrulamasını koru. Dahili API'lerde kullanıcı girişi yoktur; internet erişimi ters proxy/VPN gibi erişim koruması gerektirir.
- Veri/volume silme, reset, demo yükleme ve replace import öncesinde yedek/geri dönüş planı gerekir. Rutin kontrol için `docker compose down -v` kullanma.

## Görsel yükleme

- Yeni/düzenlenen profilde harici URL görsellerini sunucuda `remoteImage.ts` ile indir, `imageStorage.ts` ile `UPLOADS_DIR` altında fiziksel olarak sakla; veritabanına **`/api/uploads/<filename>`** yaz. `/api/uploads/` bir sunum URL'sidir, fiziksel dizin değildir.
- Dosya yükleme: `POST /api/upload`; sunum: `GET/HEAD /api/uploads/[filename]`. Eski `/uploads/*` adreslerinin rewrite uyumluluğunu koru.
- HTTP/HTTPS, 15 saniye zaman aşımı, 5 MB sınırı, JPG/PNG/WEBP MIME/dosya imzası, güvenli dosya adı ve başarısız kayıt sonrası indirilen dosyaların temizlenmesi korunur. Eski/import/demo kayıtları uzak URL içerebilir; yeni profil akışında uzak URL'yi kalıcı görsel adresi bırakma.
