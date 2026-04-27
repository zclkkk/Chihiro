import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/server/auth";
import { uploadImageToObjectStorage } from "@/server/object-storage";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "请先登录后台。" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请选择要上传的图片。" }, { status: 400 });
    }

    const uploadedImage = await uploadImageToObjectStorage(file);

    return NextResponse.json({
      url: uploadedImage.url,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "上传图片时出错了。",
      },
      { status: 400 },
    );
  }
}
