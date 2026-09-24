CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ActivityLog_profileId_createdAt_idx" ON "ActivityLog"("profileId", "createdAt");

INSERT INTO "ActivityLog" ("id", "profileId", "action", "detail", "createdAt")
SELECT 'created_' || "id", "id", 'CREATED', 'Profil oluşturuldu', "createdAt" FROM "Profile";
