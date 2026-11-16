// The bio as HTML, with the phrases in config `bioLinks` turned into links: the first time each
// phrase appears across the paragraphs given, the text itself unchanged.
import { site } from "../config";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function bioHtml(paras: string[]): string[] {
  const left = [...site.profile.bioLinks];
  return paras.map((text) => {
    let html = esc(text);
    for (const l of [...left]) {
      const at = html.indexOf(esc(l.text));
      if (at < 0) continue;
      const ext = /^https?:/.test(l.href) ? ' rel="external"' : "";
      html = `${html.slice(0, at)}<a class="link" href="${l.href}"${ext}>${esc(l.text)}</a>${html.slice(at + esc(l.text).length)}`;
      left.splice(left.indexOf(l), 1);
    }
    return html;
  });
}
