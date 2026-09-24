-- Move only the original demo profiles to English data labels while preserving
-- identically named user-created data that may be attached to other profiles.

INSERT OR IGNORE INTO "Tag" ("id", "name", "color", "createdAt")
SELECT 'demo_tag_europe_i18n', 'Europe', "color", "createdAt"
FROM "Tag" WHERE "name" = 'Avrupa';

INSERT OR IGNORE INTO "ProfileTag" ("profileId", "tagId")
SELECT pt."profileId", target."id"
FROM "ProfileTag" pt
JOIN "Tag" source ON source."id" = pt."tagId" AND source."name" = 'Avrupa'
JOIN "Tag" target ON target."name" = 'Europe'
WHERE pt."profileId" IN ('mv-001', 'mv-003', 'mv-006', 'mv-008');

DELETE FROM "ProfileTag"
WHERE "tagId" IN (SELECT "id" FROM "Tag" WHERE "name" = 'Avrupa')
  AND "profileId" IN ('mv-001', 'mv-003', 'mv-006', 'mv-008');

DELETE FROM "Tag"
WHERE "name" = 'Avrupa'
  AND NOT EXISTS (SELECT 1 FROM "ProfileTag" WHERE "tagId" = "Tag"."id");

INSERT OR IGNORE INTO "Tag" ("id", "name", "color", "createdAt")
SELECT 'demo_tag_turkey_i18n', 'Turkey', "color", "createdAt"
FROM "Tag" WHERE "name" = 'Türkiye';

INSERT OR IGNORE INTO "ProfileTag" ("profileId", "tagId")
SELECT pt."profileId", target."id"
FROM "ProfileTag" pt
JOIN "Tag" source ON source."id" = pt."tagId" AND source."name" = 'Türkiye'
JOIN "Tag" target ON target."name" = 'Turkey'
WHERE pt."profileId" = 'mv-002';

DELETE FROM "ProfileTag"
WHERE "tagId" IN (SELECT "id" FROM "Tag" WHERE "name" = 'Türkiye')
  AND "profileId" = 'mv-002';

DELETE FROM "Tag"
WHERE "name" = 'Türkiye'
  AND NOT EXISTS (SELECT 1 FROM "ProfileTag" WHERE "tagId" = "Tag"."id");

INSERT OR IGNORE INTO "Collection" ("id", "name", "createdAt")
SELECT 'demo_collection_fashion_i18n', 'Fashion Campaign', "createdAt"
FROM "Collection" WHERE "name" = 'Moda Kampanyası';

INSERT OR IGNORE INTO "ProfileCollection" ("profileId", "collectionId")
SELECT pc."profileId", target."id"
FROM "ProfileCollection" pc
JOIN "Collection" source ON source."id" = pc."collectionId" AND source."name" = 'Moda Kampanyası'
JOIN "Collection" target ON target."name" = 'Fashion Campaign'
WHERE pc."profileId" IN ('mv-001', 'mv-006');

DELETE FROM "ProfileCollection"
WHERE "collectionId" IN (SELECT "id" FROM "Collection" WHERE "name" = 'Moda Kampanyası')
  AND "profileId" IN ('mv-001', 'mv-006');

DELETE FROM "Collection"
WHERE "name" = 'Moda Kampanyası'
  AND NOT EXISTS (SELECT 1 FROM "ProfileCollection" WHERE "collectionId" = "Collection"."id");

INSERT OR IGNORE INTO "Collection" ("id", "name", "createdAt")
SELECT 'demo_collection_cosplay_i18n', 'Cosplay Reference', "createdAt"
FROM "Collection" WHERE "name" = 'Cosplay Referans';

INSERT OR IGNORE INTO "ProfileCollection" ("profileId", "collectionId")
SELECT pc."profileId", target."id"
FROM "ProfileCollection" pc
JOIN "Collection" source ON source."id" = pc."collectionId" AND source."name" = 'Cosplay Referans'
JOIN "Collection" target ON target."name" = 'Cosplay Reference'
WHERE pc."profileId" = 'mv-003';

DELETE FROM "ProfileCollection"
WHERE "collectionId" IN (SELECT "id" FROM "Collection" WHERE "name" = 'Cosplay Referans')
  AND "profileId" = 'mv-003';

DELETE FROM "Collection"
WHERE "name" = 'Cosplay Referans'
  AND NOT EXISTS (SELECT 1 FROM "ProfileCollection" WHERE "collectionId" = "Collection"."id");

UPDATE "Profile" SET "notes" = 'Follow up for the 2024 Paris Fashion Week shoots. Management contact details are available on the website.'
WHERE "id" = 'mv-001' AND "notes" = 'Paris Moda Haftası 2024 çekimleri için iletişime geçilecek. Menajerlik adresi web sitesinde mevcut.';

UPDATE "Profile" SET
  "bio" = 'Istanbul-based digital content creator and style consultant. Lover of sunny days.',
  "notes" = 'A favorite profile for Karaköy and Alaçatı summer collections. Open to collaborations.'
WHERE "id" = 'mv-002'
  AND "bio" = 'İstanbul merkezli dijital içerik üreticisi ve stil danışmanı. Güneşli günlerin aşığı.'
  AND "notes" = 'Karaköy ve Alaçatı yaz koleksiyonları için favori profil. İşbirlikleri açık.';

UPDATE "Profile" SET "notes" = 'The Cyberpunk and Witcher costume designs are incredibly detailed. Also streams on Twitch.'
WHERE "id" = 'mv-003' AND "notes" = 'Cyberpunk ve Witcher kostüm tasarımları inanılmaz detaylı. Twitch yayınları var.';

UPDATE "Profile" SET "notes" = 'The 30-day workout programs perform very well. She also runs her own activewear brand.'
WHERE "id" = 'mv-004' AND "notes" = '30 günlük antrenman programları çok başarılı. Kendi markası olan spor giyim sitesi var.';

UPDATE "Profile" SET "notes" = 'Has a studio in Berlin. Appointments open through the website on the first day of each month.'
WHERE "id" = 'mv-005' AND "notes" = 'Berlin''de stüdyosu var. Randevu alımları web sitesi üzerinden her ayın ilk günü açılıyor.';

UPDATE "Profile" SET "notes" = 'The Nice and Cannes location shoots are excellent. Uses Kodak Portra-inspired tones.'
WHERE "id" = 'mv-006' AND "notes" = 'Nice ve Cannes lokasyon çekimleri harika. Kodak portra tonları kullanıyor.';

UPDATE "Profile" SET "notes" = 'Publishes a regular portfolio newsletter on her independent website.'
WHERE "id" = 'mv-008' AND "notes" = 'Kendi bağımsız web sitesinde düzenli portfolyo bülteni yayınlıyor.';
