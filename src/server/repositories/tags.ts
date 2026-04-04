import { prisma } from "@/server/db/client";

export type TagOption = {
  id: string;
  name: string;
  slug: string;
};

export async function listTags(): Promise<TagOption[]> {
  const tags = await prisma.tag.findMany({
    orderBy: [{ name: "asc" }],
  });

  return tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
  }));
}

export async function listPostTags(): Promise<TagOption[]> {
  const tags = await prisma.tag.findMany({
    where: {
      posts: {
        some: {},
      },
    },
    orderBy: [{ name: "asc" }],
  });

  return tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
  }));
}
