// Blog posts from the security-blog repo: posts/<category>/<file>.md
// URL: /blog/<category>/<slug>/ (slug = frontmatter `slug`, else file name).
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { frontmatter, render, type Rendered } from "./markdown";

const ROOT = join(process.cwd(), "content-src/security-blog/posts");

export const CATEGORY_LABELS: Record<string, string> = {
  "malware-analysis": "Malware analysis",
  "reverse-engineering": "Reverse engineering",
  "cloud-security": "Cloud security",
  "incident-response": "Incident response",
  tooling: "Security tooling",
  notes: "Security notes",
};

export interface Post {
  slug: string;
  category: string;
  categoryLabel: string;
  url: string;
  title: string;
  date: Date;
  summary: string;
  tags: string[];
  featured: boolean;
  source: string;
  body: Rendered;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir).sort()) {
    if (e.startsWith(".")) continue;
    const p = join(dir, e);
    statSync(p).isDirectory() ? walk(p, out) : e.endsWith(".md") && out.push(p);
  }
  return out;
}

let cache: Promise<Post[]> | undefined;
export const getPosts = () => (cache ??= load());

async function load(): Promise<Post[]> {
  if (!existsSync(ROOT)) throw new Error("content-src/security-blog/posts missing — run `npm run content` first");
  const posts: Post[] = [];
  for (const file of walk(ROOT)) {
    const { data, body } = frontmatter(readFileSync(file, "utf8"));
    if (data.draft === true) continue;
    const rel = relative(ROOT, file);
    const category = typeof data.category === "string" && data.category ? data.category : rel.split("/")[0];
    const slug = typeof data.slug === "string" && data.slug ? data.slug : basename(file, ".md");
    const m = String(data.date ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) throw new Error(`${rel}: frontmatter needs date: YYYY-MM-DD`);
    const rendered = await render(body);
    posts.push({
      slug, category,
      categoryLabel: CATEGORY_LABELS[category] ?? category.replace(/-/g, " "),
      url: `/blog/${category}/${slug}/`,
      title: String(data.title ?? slug),
      date: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])),
      summary: typeof data.summary === "string" && data.summary ? data.summary : rendered.excerpt,
      tags: Array.isArray(data.tags) ? data.tags : [],
      featured: data.featured === true,
      source: `https://github.com/aaadarsh1337/security-blog/blob/main/posts/${rel}`,
      body: rendered,
    });
  }
  return posts.sort((a, b) => b.date.getTime() - a.date.getTime());
}
