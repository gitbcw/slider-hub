import { NextResponse } from "next/server";
import { createSlider, listSliders } from "@/lib/sliders";

export async function GET() {
  return NextResponse.json({ sliders: await listSliders() });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const title = formData.get("title");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请选择一个 zip 文件。" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json({ error: "只支持上传 .zip 压缩包。" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const slider = await createSlider({
      fileName: file.name,
      title: typeof title === "string" ? title : undefined,
      buffer
    });

    return NextResponse.json({ slider }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "上传失败。" },
      { status: 400 }
    );
  }
}
