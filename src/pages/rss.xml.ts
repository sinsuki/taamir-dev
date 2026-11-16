import type { APIRoute } from "astro";
import { getPublished } from "../lib/posts";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export const GET: APIRoute = async () => {
  const posts = await getPublished();
  const items = posts
    .map((post) => {
      const link = `https://taamir.dev/blog/${post.id}`;
      return `<item><title>${escapeXml(post.data.title)}</title><link>${link}</link><guid>${link}</guid><description>${escapeXml(post.data.summary)}</description></item>`;
    })
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Taamir Khan</title><link>https://taamir.dev/blog</link><description>Writing by Taamir Khan.</description>${items}</channel></rss>`;
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
};
