import { mkdir, readFile, readdir, rm, stat, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";
import AdmZip from "adm-zip";

export type SliderType = "html" | "pptx";

export type Slider = {
  id: string;
  title: string;
  originalName: string;
  createdAt: string;
  size: number;
  entry: string;
  type?: SliderType;
};

const DATA_DIR = path.join(process.cwd(), "data");
const SLIDERS_DIR = path.join(DATA_DIR, "sliders");
const DB_PATH = path.join(DATA_DIR, "sliders.json");

export async function ensureStorage() {
  await mkdir(SLIDERS_DIR, { recursive: true });
  try {
    await stat(DB_PATH);
  } catch {
    await writeFile(DB_PATH, "[]", "utf8");
  }
}

export async function listSliders(): Promise<Slider[]> {
  await ensureStorage();
  const raw = (await readFile(DB_PATH, "utf8")).replace(/^\uFEFF/, "");
  const parsed = JSON.parse(raw) as Slider[] | Slider;
  const sliders = Array.isArray(parsed) ? parsed : [parsed];
  return sliders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSlider(id: string): Promise<Slider | null> {
  const sliders = await listSliders();
  return sliders.find((slider) => slider.id === id) ?? null;
}

export async function saveSliders(sliders: Slider[]) {
  await ensureStorage();
  await writeFile(DB_PATH, JSON.stringify(sliders, null, 2), "utf8");
}

export async function deleteSlider(id: string) {
  const sliders = await listSliders();
  await saveSliders(sliders.filter((slider) => slider.id !== id));
  await rm(path.join(SLIDERS_DIR, id), { recursive: true, force: true });
}

export async function createSlider(params: {
  fileName: string;
  title?: string;
  buffer: Buffer;
}) {
  await ensureStorage();

  const id = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
  const targetDir = path.join(SLIDERS_DIR, id);
  await mkdir(targetDir, { recursive: true });

  const lowerName = params.fileName.toLowerCase();
  if (lowerName.endsWith(".pptx")) {
    return createPptxSlider({ ...params, id, targetDir });
  }

  if (!lowerName.endsWith(".zip")) {
    await rm(targetDir, { recursive: true, force: true });
    throw new Error("只支持上传 .zip 或 .pptx 文件。");
  }

  return createHtmlSlider({ ...params, id, targetDir });
}

async function createPptxSlider(params: {
  id: string;
  targetDir: string;
  fileName: string;
  title?: string;
  buffer: Buffer;
}) {
  try {
    new AdmZip(params.buffer);
  } catch {
    await rm(params.targetDir, { recursive: true, force: true });
    throw new Error("PPTX 文件无效或已损坏。");
  }

  const entry = "presentation.pptx";
  await writeFile(path.join(params.targetDir, entry), params.buffer);

  const slider: Slider = {
    id: params.id,
    title: params.title?.trim() || fileNameToTitle(params.fileName),
    originalName: params.fileName,
    createdAt: new Date().toISOString(),
    size: params.buffer.byteLength,
    entry,
    type: "pptx"
  };

  const sliders = await listSliders();
  await saveSliders([slider, ...sliders]);
  return slider;
}

async function createHtmlSlider(params: {
  id: string;
  targetDir: string;
  fileName: string;
  title?: string;
  buffer: Buffer;
}) {
  const zip = new AdmZip(params.buffer);
  const entries = zip.getEntries().filter((entry) => !entry.isDirectory);
  if (entries.length === 0) {
    await rm(params.targetDir, { recursive: true, force: true });
    throw new Error("压缩包里没有可用文件。");
  }

  let indexPath = "";
  for (const entry of entries) {
    const normalized = entry.entryName.replace(/\\/g, "/");
    if (normalized.includes("..") || path.isAbsolute(normalized)) {
      await rm(params.targetDir, { recursive: true, force: true });
      throw new Error("压缩包包含不安全路径。");
    }

    const outputPath = path.resolve(params.targetDir, normalized);
    if (!outputPath.startsWith(params.targetDir)) {
      await rm(params.targetDir, { recursive: true, force: true });
      throw new Error("压缩包包含越界路径。");
    }

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, entry.getData());

    if (!indexPath && normalized.toLowerCase().endsWith("index.html")) {
      indexPath = normalized;
    }
  }

  if (!indexPath) {
    await rm(params.targetDir, { recursive: true, force: true });
    throw new Error("没有找到 index.html。请上传包含 HTML slider 入口文件的 zip。");
  }

  const slider: Slider = {
    id: params.id,
    title: params.title?.trim() || fileNameToTitle(params.fileName),
    originalName: params.fileName,
    createdAt: new Date().toISOString(),
    size: params.buffer.byteLength,
    entry: indexPath,
    type: "html"
  };

  const sliders = await listSliders();
  await saveSliders([slider, ...sliders]);
  return slider;
}

export async function resolveSliderFile(id: string, rawPath?: string[]) {
  const slider = await getSlider(id);
  if (!slider) {
    return null;
  }

  const requested = rawPath?.length ? rawPath.join("/") : slider.entry;
  const safePath = requested.replace(/\\/g, "/");
  if (safePath.includes("..") || path.isAbsolute(safePath)) {
    return null;
  }

  const baseDir = path.resolve(SLIDERS_DIR, id);
  const fullPath = path.resolve(baseDir, safePath);
  if (!fullPath.startsWith(baseDir)) {
    return null;
  }

  try {
    const file = await readFile(fullPath);
    return {
      file,
      fullPath
    };
  } catch {
    return null;
  }
}

export async function countSliderFiles(id: string) {
  const dir = path.join(SLIDERS_DIR, id);
  return countFiles(dir);
}

async function countFiles(dir: string): Promise<number> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const counts = await Promise.all(
      entries.map((entry) => {
        const next = path.join(dir, entry.name);
        return entry.isDirectory() ? countFiles(next) : Promise.resolve(1);
      })
    );
    return counts.reduce((sum, count) => sum + count, 0);
  } catch {
    return 0;
  }
}

function fileNameToTitle(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Untitled slider";
}

export function contentTypeFor(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  };

  return types[ext] ?? "application/octet-stream";
}

export function sliderType(slider: Slider): SliderType {
  return slider.type ?? (slider.entry.toLowerCase().endsWith(".pptx") ? "pptx" : "html");
}
