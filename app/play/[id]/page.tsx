import { ArrowLeft, Download, ExternalLink, Maximize2, Presentation } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSlider, sliderType } from "@/lib/sliders";
import PptxPlayer from "./PptxPlayer";

export default async function PlayerPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const slider = await getSlider(id);
  if (!slider) {
    notFound();
  }

  const type = sliderType(slider);
  const src = `/api/sliders/${slider.id}/files`;

  return (
    <main className="player-page">
      <header className="player-bar">
        <div className="player-title">
          <Presentation size={18} />
          <span>{slider.title}</span>
        </div>
        <div className="player-actions">
          <Link className="icon-button" href="/" title="返回列表">
            <ArrowLeft size={16} />
          </Link>
          <a className="icon-button" href={src} target="_blank" title={type === "pptx" ? "下载 PPTX" : "新窗口打开"}>
            {type === "pptx" ? <Download size={16} /> : <ExternalLink size={16} />}
          </a>
          {type === "html" ? (
            <a className="button" href={src} target="_blank">
              <Maximize2 size={16} />
              全屏播放
            </a>
          ) : null}
        </div>
      </header>

      <div className="frame-wrap">
        {type === "pptx" ? (
          <PptxPlayer src={src} title={slider.title} />
        ) : (
          <iframe className="slider-frame" src={src} title={slider.title} allowFullScreen />
        )}
      </div>
    </main>
  );
}
