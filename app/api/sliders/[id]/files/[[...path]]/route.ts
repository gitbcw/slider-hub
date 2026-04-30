import { NextResponse } from "next/server";
import { contentTypeFor, resolveSliderFile } from "@/lib/sliders";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; path?: string[] }> }
) {
  const { id, path } = await params;
  const resolved = await resolveSliderFile(id, path);

  if (!resolved) {
    return NextResponse.json({ error: "文件不存在。" }, { status: 404 });
  }

  return new NextResponse(resolved.file, {
    headers: {
      "Content-Type": contentTypeFor(resolved.fullPath),
      "Cache-Control": "no-store"
    }
  });
}
