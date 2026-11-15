import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getEnv } from "lib/env";

export type Visibility = "public" | "private";
export type StoredObject = { key: string; url: string | null };

export const IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};

/** Validates by magic bytes, not just the declared type. Returns the canonical mime type or null. */
export function sniffImageType(buf: Buffer): "image/png" | "image/jpeg" | "image/webp" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

function localRoot() {
  return path.resolve(getEnv().LOCAL_STORAGE_DIR);
}

function safeLocalPath(key: string) {
  const root = localRoot();
  const full = path.resolve(root, key);
  if (!full.startsWith(root + path.sep)) throw new Error("Invalid storage key");
  return full;
}

/* ---------------------------------------------------------------- Cloudinary */
function cloudinarySign(params: Record<string, string>) {
  const env = getEnv();
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(toSign + env.CLOUDINARY_API_SECRET).digest("hex");
}

async function cloudinaryUpload(buf: Buffer, contentType: string, folder: string, visibility: Visibility): Promise<StoredObject> {
  const env = getEnv();
  const publicId = `${folder}/${randomUUID()}`;
  const params: Record<string, string> = {
    public_id: publicId,
    timestamp: Math.floor(Date.now() / 1000).toString(),
    type: visibility === "private" ? "authenticated" : "upload",
  };
  const form = new FormData();
  for (const [k, v] of Object.entries(params)) form.append(k, v);
  form.append("api_key", env.CLOUDINARY_API_KEY);
  form.append("signature", cloudinarySign(params));
  form.append("file", new Blob([new Uint8Array(buf)], { type: contentType }));
  const res = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Cloudinary upload failed (${res.status})`);
  const json = (await res.json()) as { public_id: string; secure_url: string; format: string };
  return {
    key: `cloudinary:${visibility}:${json.public_id}.${json.format}`,
    url: visibility === "public" ? json.secure_url : null,
  };
}

function cloudinaryPrivateUrl(publicIdWithExt: string) {
  const env = getEnv();
  const toSign = `v1/${publicIdWithExt}`;
  const sig = createHash("sha1").update(toSign + env.CLOUDINARY_API_SECRET).digest("base64url").slice(0, 8);
  return `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/authenticated/s--${sig}--/${toSign}`;
}

/* ------------------------------------------------------------------- Public */
export async function putObject(opts: {
  data: Buffer;
  contentType: string;
  folder: string;
  visibility: Visibility;
}): Promise<StoredObject> {
  const env = getEnv();
  if (env.STORAGE_DRIVER === "cloudinary") {
    return cloudinaryUpload(opts.data, opts.contentType, `jpxmc/${opts.folder}`, opts.visibility);
  }
  const ext = IMAGE_TYPES[opts.contentType] ?? "bin";
  const key = `${opts.visibility}/${opts.folder}/${randomUUID()}.${ext}`;
  const full = safeLocalPath(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, opts.data, { mode: 0o640 });
  return { key: `local:${key}`, url: opts.visibility === "public" ? `/api/media/${key}` : null };
}

/** Reads an object's bytes server-side. Private objects are only ever streamed through authorised routes. */
export async function getObject(storageKey: string): Promise<Buffer> {
  if (storageKey.startsWith("local:")) {
    return readFile(safeLocalPath(storageKey.slice("local:".length)));
  }
  if (storageKey.startsWith("cloudinary:")) {
    const [, visibility, ...rest] = storageKey.split(":");
    const publicId = rest.join(":");
    const env = getEnv();
    const url =
      visibility === "private"
        ? cloudinaryPrivateUrl(publicId)
        : `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`Storage fetch failed (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("Unknown storage key");
}

export async function deleteObject(storageKey: string): Promise<void> {
  if (storageKey.startsWith("local:")) {
    await unlink(safeLocalPath(storageKey.slice("local:".length))).catch(() => undefined);
    return;
  }
  if (storageKey.startsWith("cloudinary:")) {
    const env = getEnv();
    const [, visibility, ...rest] = storageKey.split(":");
    const publicId = rest.join(":").replace(/\.[a-z0-9]+$/i, "");
    const params: Record<string, string> = {
      public_id: publicId,
      timestamp: Math.floor(Date.now() / 1000).toString(),
      type: visibility === "private" ? "authenticated" : "upload",
    };
    const form = new FormData();
    for (const [k, v] of Object.entries(params)) form.append(k, v);
    form.append("api_key", env.CLOUDINARY_API_KEY);
    form.append("signature", cloudinarySign(params));
    await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/destroy`, { method: "POST", body: form }).catch(
      () => undefined,
    );
  }
}

/** Reads and validates an uploaded image from multipart form data. */
export async function readImageUpload(file: FormDataEntryValue | null, maxBytes: number) {
  if (!file || typeof file === "string") return { error: "Please choose an image file." } as const;
  if (file.size > maxBytes) return { error: `File is too large. Maximum size is ${Math.round(maxBytes / 1024 / 1024)} MB.` } as const;
  if (!Object.keys(IMAGE_TYPES).includes(file.type)) return { error: "Only PNG, JPG, JPEG and WebP images are allowed." } as const;
  const data = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImageType(data);
  if (!sniffed) return { error: "The file is not a valid PNG, JPEG or WebP image." } as const;
  return { data, contentType: sniffed, filename: (file as File).name?.slice(0, 200) || "upload" } as const;
}
