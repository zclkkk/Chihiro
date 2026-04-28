import { ContentStatus } from "@prisma/client";

export function getOptionalString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

export function getRequiredString(formData: FormData, key: string, label?: string): string {
  const value = getOptionalString(formData, key);
  if (!value) throw new Error(`请填写${label ?? key}。`);
  return value;
}

export function getOptionalNumber(formData: FormData, key: string): number | null {
  const value = getOptionalString(formData, key);
  if (!value) return null;
  if (!/^\d+$/.test(value)) throw new Error(`请填写有效的${key}。`);
  return Number(value);
}

export function getRequiredNumber(formData: FormData, key: string): number {
  const value = getOptionalNumber(formData, key);
  if (value === null) throw new Error(`请填写${key}。`);
  return value;
}

export function getContentStatus(formData: FormData, key: string): ContentStatus {
  const value = getOptionalString(formData, key);
  return value === ContentStatus.PUBLISHED ? ContentStatus.PUBLISHED : ContentStatus.DRAFT;
}
