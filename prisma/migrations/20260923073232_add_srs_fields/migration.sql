-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Card" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "particle" TEXT NOT NULL,
    "reading" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "example" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deckId" INTEGER NOT NULL,
    "mastered" BOOLEAN NOT NULL DEFAULT false,
    "srsRepetitions" INTEGER NOT NULL DEFAULT 0,
    "srsInterval" INTEGER NOT NULL DEFAULT 0,
    "srsEaseFactor" REAL NOT NULL DEFAULT 2.5,
    "srsDueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Card_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "Deck" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Card" ("createdAt", "deckId", "example", "id", "mastered", "meaning", "particle", "reading", "translation") SELECT "createdAt", "deckId", "example", "id", "mastered", "meaning", "particle", "reading", "translation" FROM "Card";
DROP TABLE "Card";
ALTER TABLE "new_Card" RENAME TO "Card";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
