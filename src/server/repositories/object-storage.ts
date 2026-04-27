import { AssetProvider } from "@prisma/client";
import { prisma } from "@/server/db/client";

export type ObjectStorageSettingsRecord = {
  provider: Extract<AssetProvider, "S3" | "R2">;
  endpoint: string | null;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  keyPrefix: string | null;
  forcePathStyle: boolean;
};

export async function getObjectStorageSettings(): Promise<ObjectStorageSettingsRecord | null> {
  const settings = await prisma.objectStorageSettings.findUnique({
    where: {
      id: "default",
    },
  });

  if (!settings) {
    return null;
  }

  return mapObjectStorageSettings(settings);
}

export async function upsertObjectStorageSettings(input: ObjectStorageSettingsRecord) {
  assertObjectStorageProvider(input.provider);

  return prisma.objectStorageSettings.upsert({
    where: {
      id: "default",
    },
    update: {
      provider: input.provider,
      endpoint: input.endpoint,
      region: input.region,
      bucket: input.bucket,
      accessKeyId: input.accessKeyId,
      secretAccessKey: input.secretAccessKey,
      publicBaseUrl: input.publicBaseUrl,
      keyPrefix: input.keyPrefix,
      forcePathStyle: input.forcePathStyle,
    },
    create: {
      id: "default",
      provider: input.provider,
      endpoint: input.endpoint,
      region: input.region,
      bucket: input.bucket,
      accessKeyId: input.accessKeyId,
      secretAccessKey: input.secretAccessKey,
      publicBaseUrl: input.publicBaseUrl,
      keyPrefix: input.keyPrefix,
      forcePathStyle: input.forcePathStyle,
    },
  });
}

function mapObjectStorageSettings(settings: NonNullable<Awaited<ReturnType<typeof prisma.objectStorageSettings.findUnique>>>): ObjectStorageSettingsRecord {
  assertObjectStorageProvider(settings.provider);

  return {
    provider: settings.provider,
    endpoint: settings.endpoint,
    region: settings.region,
    bucket: settings.bucket,
    accessKeyId: settings.accessKeyId,
    secretAccessKey: settings.secretAccessKey,
    publicBaseUrl: settings.publicBaseUrl,
    keyPrefix: settings.keyPrefix,
    forcePathStyle: settings.forcePathStyle,
  };
}

function assertObjectStorageProvider(provider: AssetProvider): asserts provider is Extract<AssetProvider, "S3" | "R2"> {
  if (provider !== AssetProvider.S3 && provider !== AssetProvider.R2) {
    throw new Error("图床只支持 S3 或 R2 对象存储。");
  }
}
