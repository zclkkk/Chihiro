import { CategoryKind, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";

export type CategoryOption = {
  id: number;
  kind: CategoryKind;
  name: string;
  slug: string;
  description: string | null;
  contentCount: number;
};

export async function listCategoriesByKind(kind: CategoryKind): Promise<CategoryOption[]> {
  const categories = await prisma.category.findMany({
    where: { kind },
    include: {
      _count: {
        select: {
          posts: true,
          updates: true,
        },
      },
    },
    orderBy: [{ name: "asc" }],
  });

  return categories.map((category) => ({
    id: category.id,
    kind: category.kind,
    name: category.name,
    slug: category.slug,
    description: category.description,
    contentCount: kind === CategoryKind.POST ? category._count.posts : category._count.updates,
  }));
}

export async function getCategoryByIdForAdmin(id: number): Promise<CategoryOption | null> {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          posts: true,
          updates: true,
        },
      },
    },
  });

  if (!category) {
    return null;
  }

  return {
    id: category.id,
    kind: category.kind,
    name: category.name,
    slug: category.slug,
    description: category.description,
    contentCount:
      category.kind === CategoryKind.POST ? category._count.posts : category._count.updates,
  };
}

export async function updateCategoryById(input: {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}): Promise<CategoryOption> {
  const category = await prisma.category.update({
    where: { id: input.id },
    data: {
      name: input.name,
      slug: input.slug,
      description: input.description,
    },
    include: {
      _count: {
        select: {
          posts: true,
          updates: true,
        },
      },
    },
  });

  return {
    id: category.id,
    kind: category.kind,
    name: category.name,
    slug: category.slug,
    description: category.description,
    contentCount:
      category.kind === CategoryKind.POST ? category._count.posts : category._count.updates,
  };
}

export async function createCategory(input: {
  kind: CategoryKind;
  name: string;
  slug: string;
  description: string | null;
}): Promise<CategoryOption> {
  const category = await prisma.category.create({
    data: {
      kind: input.kind,
      name: input.name,
      slug: input.slug,
      description: input.description,
    },
    include: {
      _count: {
        select: {
          posts: true,
          updates: true,
        },
      },
    },
  });

  return {
    id: category.id,
    kind: category.kind,
    name: category.name,
    slug: category.slug,
    description: category.description,
    contentCount:
      category.kind === CategoryKind.POST ? category._count.posts : category._count.updates,
  };
}

export async function deleteCategoryById(id: number): Promise<CategoryOption> {
  const category = await prisma.$transaction(async (tx) => {
    const current = await tx.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            posts: true,
            updates: true,
          },
        },
      },
    });

    if (!current) {
      throw new Error("分类不存在。");
    }

    await tx.post.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });

    await tx.update.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });

    const posts = await tx.post.findMany({
      select: {
        id: true,
        categoryId: true,
        publishedSnapshot: true,
        draftSnapshot: true,
      },
    });

    for (const post of posts) {
      const shouldClearPublishedSnapshot =
        post.categoryId === id || snapshotReferencesCategory(post.publishedSnapshot, id);
      const shouldClearDraftSnapshot = snapshotReferencesCategory(post.draftSnapshot, id);

      if (!shouldClearPublishedSnapshot && !shouldClearDraftSnapshot) {
        continue;
      }

      const data: Prisma.PostUpdateInput = {};

      if (shouldClearPublishedSnapshot) {
        data.publishedSnapshot = stripCategoryFromSnapshot(post.publishedSnapshot);
      }

      if (shouldClearDraftSnapshot) {
        data.draftSnapshot = stripCategoryFromSnapshot(post.draftSnapshot);
      }

      await tx.post.update({
        where: { id: post.id },
        data,
      });
    }

    await tx.category.delete({
      where: { id },
    });

    return current;
  });

  return {
    id: category.id,
    kind: category.kind,
    name: category.name,
    slug: category.slug,
    description: category.description,
    contentCount:
      category.kind === CategoryKind.POST ? category._count.posts : category._count.updates,
  };
}

function snapshotReferencesCategory(snapshot: Prisma.JsonValue | null, categoryId: number) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return false;
  }

  const category = (snapshot as { category?: { id?: unknown } | null }).category;

  return Boolean(
    category &&
      typeof category === "object" &&
      !Array.isArray(category) &&
      Number((category as { id?: unknown }).id) === categoryId,
  );
}

function stripCategoryFromSnapshot(snapshot: Prisma.JsonValue | null) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return Prisma.DbNull;
  }

  return {
    ...(snapshot as Record<string, unknown>),
    category: null,
  } as Prisma.InputJsonValue;
}
