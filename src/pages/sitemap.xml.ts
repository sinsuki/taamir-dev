import type { APIRoute } from "astro";
import { getPublished } from "../lib/posts";

const tags = ["tech", "life", "notes", "work"];

export const GET: APIRoute = async () => {
  const posts = await getPublished();
  const paths = [
    "/",
    "/blog",
    "/rss.xml",
    ...tags.map((tag) => `/blog/tag/${tag}`),
    ...posts.map((post) => `/blog/${post.id}`),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths
    .map((path) => `<url><loc>https://taamir.dev${path}</loc></url>`)
    .join("")}</urlset>`;
  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
