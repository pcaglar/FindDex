CREATE TABLE "ProfileImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProfileImage_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ProfileImage_profileId_sortOrder_idx" ON "ProfileImage"("profileId", "sortOrder");

-- Eski tek fotoğraflı kayıtları kayıpsız biçimde galerinin kapak görseline taşı.
INSERT INTO "ProfileImage" ("id", "profileId", "url", "isCover", "sortOrder", "createdAt")
SELECT 'legacy_' || "id", "id", "avatarUrl", true, 0, CURRENT_TIMESTAMP
FROM "Profile"
WHERE "avatarUrl" IS NOT NULL AND TRIM("avatarUrl") <> '';
