import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/server/auth";
import { createSupabaseAdminClient } from "@/server/supabase/admin";

const MAX_IMAGE_UPLOAD_SIZE = 5 * 1024 * 1024;

const IMAGE_MIME_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
]);

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "请先登录后台。" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请选择要上传的图片。" }, { status: 400 });
    }

    if (file.size > MAX_IMAGE_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: `图片不能超过 ${MAX_IMAGE_UPLOAD_SIZE / 1024 / 1024}MB。` },
        { status: 400 },
      );
    }

    if (!IMAGE_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "只支持上传 AVIF、GIF、JPEG、PNG、SVG 或 WebP 图片。" },
        { status: 400 },
      );
    }

    const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "content";
    const ext = getSafeExtension(file.name, file.type);
    const date = new Date();
    const datePath = `${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${String(date.getUTCDate()).padStart(2, "0")}`;
    const storageKey = `images/${datePath}/${crypto.randomUUID()}${ext}`;

    const supabase = createSupabaseAdminClient();
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storageKey, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const publicBase = process.env.SUPABASE_STORAGE_PUBLIC_BASE_URL ?? "";
    const url = publicBase
      ? `${publicBase.replace(/\/+$/, "")}/${storageKey}`
      : supabase.storage.from(bucket).getPublicUrl(storageKey).data.publicUrl;

    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "上传图片时出错了。" },
      { status: 400 },
    );
  }
}

function getSafeExtension(filename: string, mimeType: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext && /^\.[a-z0-9]+$/.test(`.${ext}`)) return `.${ext}`;
  switch (mimeType) {
    case "image/avif": return ".avif";
    case "image/gif": return ".gif";
    case "image/jpeg": return ".jpg";
    case "image/png": return ".png";
    case "image/svg+xml": return ".svg";
    case "image/webp": return ".webp";
    default: return "";
  }
}
