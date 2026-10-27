// Width/height of a PNG or JPEG on disk, so pages can reserve space for it.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
export function imageSize(path: string): { width: number; height: number } | undefined {
  const file = join(process.cwd(), path);
  if (!existsSync(file)) return;
  const b = readFileSync(file);
  if (b.readUInt32BE(0) === 0x89504e47) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i < b.length - 9;) {
      if (b[i] !== 0xff) return;
      const marker = b[i + 1], len = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xc3) return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
      i += 2 + len;
    }
  }
}
