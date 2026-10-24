"use client";

import { useEffect, useRef, useState } from "react";
import { init } from "pptx-preview";

type PptxPlayerProps = {
  src: string;
  title: string;
};

export default function PptxPlayer({ src, title }: PptxPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState("正在加载 PPTX...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let cancelled = false;
    const previewer = init(container, {
      width: 1280,
      height: 720,
      mode: "slide"
    });

    async function loadPptx() {
      try {
        const response = await fetch(src, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("PPTX 文件加载失败。");
        }

        const buffer = await response.arrayBuffer();
        if (cancelled) {
          return;
        }

        await previewer.preview(buffer);
        if (!cancelled) {
          setStatus("");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "PPTX 播放失败。");
          setStatus("");
        }
      }
    }

    loadPptx();

    return () => {
      cancelled = true;
      previewer.destroy();
    };
  }, [src]);

  return (
    <div className="pptx-player" aria-label={title}>
      {status ? <div className="pptx-status">{status}</div> : null}
      {error ? <div className="pptx-status error">{error}</div> : null}
      <div ref={containerRef} className="pptx-preview" />
    </div>
  );
}
