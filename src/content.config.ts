import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({ base: "./src/content/posts", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    summary: z.string().max(160),
    tags: z.array(z.enum(["tech", "life", "notes", "work"])),
    draft: z.boolean().default(false),
    cover: z.string().optional(),
  }),
});

export const collections = { posts };
