import { NextResponse } from "next/server";
import { deleteSlider, getSlider } from "@/lib/sliders";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const slider = await getSlider(id);
  if (!slider) {
    return NextResponse.json({ error: "Slider 不存在。" }, { status: 404 });
  }

  return NextResponse.json({ slider });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await deleteSlider(id);
  return NextResponse.json({ ok: true });
}
