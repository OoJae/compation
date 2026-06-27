-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "route" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DecisionStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "toolName" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DecisionStep_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT,
    "venueKey" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "size" REAL NOT NULL,
    "notional" REAL NOT NULL,
    "margin" REAL NOT NULL,
    "openTxHash" TEXT NOT NULL,
    "explorerUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    CONSTRAINT "Position_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT,
    "kind" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "denom" TEXT NOT NULL,
    "txHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "IdentityRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentAddress" TEXT NOT NULL,
    "registrationTx" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "DecisionStep_sessionId_seq_idx" ON "DecisionStep"("sessionId", "seq");
