import { ArrowLeft, Maximize2, ExternalLink, Presentation } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSlider } from "@/lib/sliders";

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
          <a className="icon-button" href={src} target="_blank" title="新窗口打开">
            <ExternalLink size={16} />
          </a>
          <a className="button" href={src} target="_blank">
            <Maximize2 size={16} />
            全屏播放
          </a>
        </div>
      </header>

      <div className="frame-wrap">
        <iframe className="slider-frame" src={src} title={slider.title} allowFullScreen />
      </div>
    </main>
  );
}
