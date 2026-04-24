import { createBrowserClient } from "@supabase/ssr";

export async function uploadToSiteAssets(
  file: File,
  userId: string,
  onProgress?: (event: { progress: number }) => void,
): Promise<{ storagePath: string; publicUrl: string }> {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${userId}/${timestamp}-${safeName}`;

  const { error } = await supabase.storage
    .from("site-assets")
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  onProgress?.({ progress: 100 });

  const { data: urlData } = supabase.storage
    .from("site-assets")
    .getPublicUrl(storagePath);

  return {
    storagePath,
    publicUrl: urlData.publicUrl,
  };
}
