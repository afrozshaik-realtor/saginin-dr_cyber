import { existsSync } from "node:fs";
import path from "node:path";
import { blogImages, type BlogImageKey } from "./images";
import type { BlogImage } from "./types";

/** Returns the image only when its file exists in /public, so pages never ship broken images. */
export function resolveBlogImage(key: BlogImageKey): BlogImage | null {
  const image: BlogImage = blogImages[key];
  return existsSync(path.join(process.cwd(), "public", image.src)) ? image : null;
}
