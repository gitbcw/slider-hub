import {
  Archive,
  ExternalLink,
  FolderOpen,
  Library,
  Play,
  RefreshCw,
  Trash2
} from "lucide-react";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { countSliderFiles, createSlider, deleteSlider, listSliders } from "@/lib/sliders";

async function uploadSlider(formData: FormData) {
  "use server";

  const file = formData.get("file");
  const title = formData.get("title");

  if (!(file instanceof File)) {
    throw new Error("请选择一个 zip 文件。");
  }

  if (!file.name.toLowerCase().endsWith(".zip")) {
    throw new Error("只支持上传 .zip 压缩包。");
  }

  await createSlider({
    fileName: file.name,
    title: typeof title === "string" ? title : undefined,
    buffer: Buffer.from(await file.arrayBuffer())
  });

  revalidatePath("/");
}

async function removeSlider(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  if (id) {
    await deleteSlider(id);
  }
  revalidatePath("/");
}

export default async function Home() {
  const sliders = await listSliders();
  const fileCounts = new Map(
    await Promise.all(sliders.map(async (slider) => [slider.id, await countSliderFiles(slider.id)] as const))
  );

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Library size={20} />
          </div>
          <div>
            <h1>Slider Hub</h1>
            <p>管理、归档和播放团队内部的 HTML sliders。</p>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="stat-chip">
            <span>{sliders.length}</span>
            <small>已归档</small>
          </div>
          <Link className="button" href="/">
            <RefreshCw size={16} />
            刷新
          </Link>
        </div>
      </header>

      <section className="overview">
        <div>
          <span className="eyebrow">HTML Slider Library</span>
          <h2>把每一份网页 PPT 都变成可复用资产</h2>
        </div>
        <p>
          上传包含 <code>index.html</code> 的 zip，系统会自动解压并保留图片、字体、脚本等资源。播放时使用独立
          iframe，不影响原始 slider 的交互。
        </p>
      </section>

      <div className="dashboard">
        <section className="panel upload-panel">
          <div className="panel-title">
            <FolderOpen size={18} />
            <h2>上传新的 slider</h2>
          </div>
          <UploadForm />
        </section>

        <section className="panel library">
          <div className="library-head">
            <div className="panel-title">
              <Library size={18} />
              <h2>资产库</h2>
            </div>
            <span className="hint">{sliders.length} 个文件集</span>
          </div>

          {sliders.length === 0 ? (
            <div className="empty">
              <Archive size={24} />
              <strong>还没有上传内容</strong>
              <span>请上传包含 index.html 的 zip 压缩包。</span>
            </div>
          ) : (
            <div className="library-list">
              {sliders.map((slider) => (
                <article className="slider-card" key={slider.id}>
                  <div className="slider-main">
                    <div className="file-badge">HTML</div>
                    <h3>{slider.title}</h3>
                    <div className="meta">
                      <span>{slider.originalName}</span>
                      <span>
                        {formatBytes(slider.size)} · {fileCounts.get(slider.id) ?? 0} 个文件
                      </span>
                      <span>{new Date(slider.createdAt).toLocaleString("zh-CN")}</span>
                    </div>
                  </div>

                  <div className="card-actions">
                    <Link className="button primary" href={`/play/${slider.id}`}>
                      <Play size={16} />
                      播放
                    </Link>
                    <Link
                      className="icon-button"
                      href={`/api/sliders/${slider.id}/files`}
                      target="_blank"
                      title="打开原始 HTML"
                    >
                      <ExternalLink size={16} />
                    </Link>
                    <form action={removeSlider}>
                      <input type="hidden" name="id" value={slider.id} />
                      <button className="icon-button danger-icon" type="submit" title="删除">
                        <Trash2 size={16} />
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function UploadForm() {
  return (
    <form className="dropzone" action={uploadSlider}>
      <div className="field">
        <label htmlFor="title">标题</label>
        <input id="title" name="title" placeholder="默认使用 zip 文件名" />
      </div>

      <div className="field">
        <label htmlFor="file">ZIP 文件</label>
        <input id="file" name="file" type="file" accept=".zip,application/zip" required />
      </div>

      <div className="upload-actions">
        <button className="button primary" type="submit">
          <Archive size={16} />
          上传并解压
        </button>
      </div>

      <p className="hint">
        压缩包根目录或子目录里需要有 index.html，相关 assets、images、fonts 会一并保留。
      </p>
    </form>
  );
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
