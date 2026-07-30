CREATE TABLE IF NOT EXISTS "pageViews" (
  "id" serial PRIMARY KEY NOT NULL,
  "page" varchar(255) NOT NULL,
  "userId" integer,
  "sessionId" varchar(100),
  "userAgent" text,
  "referer" text,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "payments" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "mpPaymentId" varchar(100) NOT NULL UNIQUE,
  "planCode" varchar(60) NOT NULL,
  "amount" varchar(20) NOT NULL,
  "status" varchar(50) NOT NULL,
  "paymentMethod" varchar(50),
  "payerEmail" varchar(320),
  "payerName" text,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "approvedAt" timestamp,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "maxSheetsPerMonth" integer DEFAULT 1 NOT NULL;
