// Markdown → HTML for writeups and blog posts.
//
// The source repos are plain Markdown written for GitHub, so this pipeline is
// deliberately conservative: raw HTML in Markdown is dropped (remark-rehype's
// default), dangerous URL schemes are stripped, and every enhancement below is
// presentational only — the author's words are never rewritten.
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { visit, SKIP } from "unist-util-visit";
import { toString } from "hast-util-to-string";
import { h } from "hastscript";
import { createCssVariablesTheme, createHighlighter, type Highlighter } from "shiki";
import type { Element, ElementContent, Root, RootContent } from "hast";

export interface Heading { depth: 2 | 3; id: string; text: string }
export interface Listing { id: string; n: number; lang: string; lines: number; label: string }
export interface Figure { id: string; n: number; caption: string; src: string }
export interface Rendered {
  html: string;
  headings: Heading[];
  listings: Listing[];
  figures: Figure[];
  words: number;
  excerpt: string;
  /** From a leading "## Challenge: <url>" / "## Room link: <url>" heading. */
  challenge?: { label: string; url: string };
}

const LANG_ALIAS: Record<string, string> = { py: "python", sh: "bash", shell: "bash", console: "bash", js: "javascript" };
const LANGS = ["bash", "python", "c", "asm", "javascript", "json", "yaml", "diff", "ini", "powershell", "sql", "go", "rust"];
const FLAG = /(THM|flag|picoCTF|HTB|ReRange)\{[^}]*\}/i;
const SAFE_URL = /^(https?:|mailto:|#|\/|\.{0,2}\/|[^:]*$)/i;

const theme = createCssVariablesTheme({ name: "lunar", variablePrefix: "--sh-", fontStyle: true });
let highlighter: Promise<Highlighter> | undefined;
const getHighlighter = () => (highlighter ??= createHighlighter({ themes: [theme], langs: LANGS }));

const cls = (el: Element, name: string) => {
  const list = (el.properties.className as string[] | undefined) ?? [];
  el.properties.className = [...list, name];
};

/** Shiki emits `style="color:var(--sh-token-x)"`; turn that into classes so the
 *  palette lives in CSS (and switches with the theme) instead of inline styles. */
function tokenClasses(tree: Root | Element) {
  visit(tree, "element", (el) => {
    const style = el.properties.style;
    if (typeof style !== "string") return;
    const classes: string[] = [];
    const color = style.match(/var\(--sh-(?:token-)?([a-z-]+)\)/);
    if (color && color[1] !== "foreground") classes.push(`t-${color[1]}`);
    if (/font-style:\s*italic/.test(style)) classes.push("t-italic");
    if (/font-weight:\s*bold/.test(style)) classes.push("t-bold");
    delete el.properties.style;
    if (classes.length) el.properties.className = classes;
  });
}

function enhance(hl: Highlighter, out: Omit<Rendered, "html" | "words" | "excerpt">) {
  return (tree: Root) => {
    // 1. Title is rendered by the layout: drop the leading h1, demote the rest.
    const firstH1 = tree.children.findIndex((n) => n.type === "element" && n.tagName === "h1");
    const leading = tree.children.slice(0, firstH1).every((n) => n.type === "text" && !n.value.trim());
    if (firstH1 >= 0 && leading) tree.children.splice(firstH1, 1);
    visit(tree, "element", (el) => { if (el.tagName === "h1") el.tagName = "h2"; });

    // 2. "## Challenge: <url>" is metadata, not a section.
    const first = tree.children.find((n): n is Element => n.type === "element");
    if (first && first.tagName === "h2") {
      const link = first.children.find((c): c is Element => c.type === "element" && c.tagName === "a");
      const label = toString(first).replace(String(link?.properties.href ?? ""), "").replace(/[:\s]+$/, "").trim();
      if (link && /^(challenge|room|room link|link|task)$/i.test(label)) {
        out.challenge = { label, url: String(link.properties.href) };
        tree.children.splice(tree.children.indexOf(first), 1);
      }
    }

    visit(tree, "element", (el, index, parent) => {
      if (!parent || index === undefined) return;

      // URLs: strip anything that isn't http(s)/mailto/relative.
      for (const attr of ["href", "src"] as const) {
        const v = el.properties[attr];
        if (typeof v === "string" && !SAFE_URL.test(v.trim())) delete el.properties[attr];
      }
      if (el.tagName === "a" && typeof el.properties.href === "string" && /^https?:/.test(el.properties.href)) {
        el.properties.rel = ["noopener", "external"];
      }

      if (el.tagName === "h2" || el.tagName === "h3") {
        out.headings.push({ depth: el.tagName === "h2" ? 2 : 3, id: String(el.properties.id), text: toString(el).trim() });
      }

      // Paragraph holding only an image → numbered figure with alt as caption.
      if (el.tagName === "p") {
        const kids = el.children.filter((c) => !(c.type === "text" && !c.value.trim()));
        const img = kids.length === 1 && kids[0].type === "element" && kids[0].tagName === "img" ? kids[0] : null;
        if (img) {
          const n = out.figures.length + 1;
          const caption = String(img.properties.alt ?? "").trim();
          img.properties.loading = "lazy";
          img.properties.decoding = "async";
          const fig = h("figure.figure", { id: `fig-${n}` }, [
            img,
            h("figcaption", [h("span.figure__n", `fig. ${n}`), caption ? ` ${caption}` : ""]),
          ]);
          out.figures.push({ id: `fig-${n}`, n, caption: caption || `figure ${n}`, src: String(img.properties.src ?? "") });
          parent.children[index] = fig;
          return SKIP;
        }
      }

      if (el.tagName === "blockquote" && FLAG.test(toString(el))) cls(el, "flag");

      if (el.tagName === "table") {
        parent.children[index] = h("div.table", [el]);
        return SKIP;
      }

      // Fenced code → highlighted, numbered listing with a small header.
      if (el.tagName === "pre") {
        const code = el.children.find((c): c is Element => c.type === "element" && c.tagName === "code");
        if (!code) return;
        const raw = toString(code).replace(/\n$/, "");
        const declared = ((code.properties.className as string[] | undefined) ?? [])
          .find((c) => c.startsWith("language-"))?.slice(9).toLowerCase() ?? "";
        const lang = LANG_ALIAS[declared] ?? declared;
        const known = hl.getLoadedLanguages().includes(lang);
        const hast = hl.codeToHast(raw, { lang: known ? lang : "text", theme: "lunar" });
        tokenClasses(hast);
        const pre = hast.children[0] as Element;
        pre.properties = { className: ["code"], tabindex: 0 };
        const n = out.listings.length + 1;
        const lines = raw.split("\n").length;
        // Label = the sentence that introduces the listing, falling back to its first line.
        const prev = parent.children.slice(0, index).reverse()
          .find((c): c is Element => c.type === "element" && c.tagName === "p");
        const intro = prev ? toString(prev).trim().replace(/[:.]\s*$/, "") : "";
        const label = (intro.length >= 14 && intro.length <= 48 ? intro : raw.split("\n").find((l) => l.trim())?.trim() ?? "").slice(0, 60);
        out.listings.push({ id: `lst-${n}`, n, lang: declared || "text", lines, label });
        parent.children[index] = h("figure.listing", { id: `lst-${n}`, dataLang: declared || "text" }, [
          h("figcaption.listing__bar", { "data-pagefind-ignore": "" }, [
            h("span.listing__lang", declared || "text"),
            h("span.listing__lines", `${lines} ${lines === 1 ? "line" : "lines"}`),
            h("button.listing__copy", { type: "button", dataCopy: "" }, "copy"),
          ]),
          pre,
        ]);
        return SKIP;
      }
    });
  };
}

function excerptOf(tree: Root, limit = 200): string {
  for (const node of tree.children as RootContent[]) {
    if (node.type !== "element" || node.tagName !== "p") continue;
    const text = toString(node).replace(/\s+/g, " ").trim();
    if (text.length >= 40) return text.length <= limit ? text : text.slice(0, limit).replace(/\s+\S*$/, "") + "…";
  }
  return "";
}

export async function render(markdown: string): Promise<Rendered> {
  const hl = await getHighlighter();
  const out = { headings: [] as Heading[], listings: [] as Listing[], figures: [] as Figure[], challenge: undefined as Rendered["challenge"] };
  let excerpt = "";
  let words = 0;
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(() => enhance(hl, out))
    .use(() => (tree: Root) => {
      excerpt = excerptOf(tree);
      const prose = { ...tree, children: tree.children.filter((c) => !(c.type === "element" && c.tagName === "figure")) } as Root;
      words = toString(prose).split(/\s+/).filter(Boolean).length;
    })
    .use(rehypeStringify)
    .process(markdown);
  return { html: String(file), words, excerpt, ...out };
}

/** Tiny YAML-frontmatter reader: `key: value`, quoted strings, `[a, b]` lists. */
export function frontmatter(text: string): { data: Record<string, string | string[] | boolean>; body: string } {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: text };
  const data: Record<string, string | string[] | boolean> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    const unq = (s: string) => s.replace(/^(["'])(.*)\1$/, "$2");
    if (v.startsWith("[") && v.endsWith("]")) data[kv[1]] = v.slice(1, -1).split(",").map((s) => unq(s.trim())).filter(Boolean);
    else if (v === "true" || v === "false") data[kv[1]] = v === "true";
    else data[kv[1]] = unq(v);
  }
  return { data, body: text.slice(m[0].length) };
}

export type { ElementContent };
