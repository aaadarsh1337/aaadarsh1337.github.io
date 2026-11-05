#!/usr/bin/env python3
"""trace-kanji.py CHARS...  Regenerate src/lib/kanji.ts with these characters, traced from
the Shippori Mincho SemiBold subsets in node_modules (needs fonttools + brotli)."""
import re, sys, pathlib
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
site = pathlib.Path(__file__).resolve().parent.parent
root = site / "node_modules/@fontsource/shippori-mincho"
blocks = re.findall(r"@font-face\s*{[^}]*}", (root / "600.css").read_text())
def subset(cp):
    for b in blocks:
        url = re.search(r"url\(\./files/([^)]*\.woff2)\)", b); ur = re.search(r"unicode-range:\s*([^;]*);", b)
        for part in ur.group(1).split(","):
            part = part.strip()[2:]
            a, z = (int(x, 16) for x in part.split("-")) if "-" in part else (int(part, 16),) * 2
            if a <= cp <= z: return root / "files" / url.group(1)
out = ["// Kanji outlines traced from Shippori Mincho SemiBold (OFL), so they render the same",
       "// everywhere without loading a Japanese font. Each glyph sits in a 1000x1000 em box,",
       "// y pointing down. Regenerate with: python3 scripts/trace-kanji.py <all the characters>",
       "export const KANJI: Record<string, string> = {"]
for ch in dict.fromkeys("".join(sys.argv[1:])):
    f = TTFont(subset(ord(ch))); gs = f.getGlyphSet()
    pen = SVGPathPen(gs, lambda v: f"{v:.0f}")
    gs[f.getBestCmap()[ord(ch)]].draw(TransformPen(pen, (1, 0, 0, -1, 0, 880)))
    out.append(f'  "{ch}": "{pen.getCommands()}",')
(site / "src/lib/kanji.ts").write_text("\n".join(out) + "\n};\n")
print(len(out) - 4, "glyphs written")
