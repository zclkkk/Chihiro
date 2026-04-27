CREATE TABLE "ObjectStorageSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "provider" "AssetProvider" NOT NULL DEFAULT 'R2',
    "endpoint" TEXT,
    "region" TEXT NOT NULL DEFAULT 'auto',
    "bucket" TEXT NOT NULL,
    "accessKeyId" TEXT NOT NULL,
    "secretAccessKey" TEXT NOT NULL,
    "publicBaseUrl" TEXT NOT NULL,
    "keyPrefix" TEXT,
    "forcePathStyle" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObjectStorageSettings_pkey" PRIMARY KEY ("id")
);
