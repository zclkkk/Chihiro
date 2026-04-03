import { PrismaPg } from "@prisma/adapter-pg";
import { CategoryKind, ContentStatus, PrismaClient, AssetProvider, AssetKind } from "@prisma/client";
import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const pool = new Pool({
  connectionString,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const siteSettings = {
  siteName: "Chihiro",
  siteDescription: "A publishing system for stories, ideas, and product notes.",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000",
  locale: "zh-CN",
  authorName: "Yinian",
  authorAvatarUrl: "/avatar.png",
  summary:
    "This is where I share projects, experiments, and reflections on building, learning, and the things that keep me curious.",
  motto: "It is the time you have wasted for your rose makes your rose so important.",
  email: "i@xiamii.com",
  githubUrl: "https://github.com/Yiniann",
};

const postSeeds = [
  {
    title: "Hello Chihiro",
    slug: "hello-chihiro",
    summary: "The first post of the Chihiro publishing project.",
    status: ContentStatus.PUBLISHED,
    publishedAt: "2026-03-30T00:00:00.000Z",
    updatedAt: "2026-03-30T00:00:00.000Z",
    category: {
      name: "Product Notes",
      slug: "product-notes",
    },
    tags: [
      { name: "Intro", slug: "intro" },
      { name: "Nextjs", slug: "nextjs" },
    ],
    authorName: "Yinian",
    content: [
      "Chihiro starts as a blog-first project, but the long-term direction is a lightweight publishing system with a public site, an admin console, and an API layer.",
      "For now, we are keeping the content source local so that routing, layout, SEO, and RSS can be implemented without waiting for the database and admin workflow.",
      "Once the public reading experience is stable, the same post model can later be backed by a database and managed through the admin side.",
    ],
  },
  {
    title: "Why the structure comes first",
    slug: "why-structure-comes-first",
    summary: "A short note on why the routing and post model are the first building blocks.",
    status: ContentStatus.PUBLISHED,
    publishedAt: "2025-10-21T00:00:00.000Z",
    updatedAt: "2026-03-29T00:00:00.000Z",
    category: {
      name: "Engineering",
      slug: "engineering",
    },
    tags: [{ name: "Architecture", slug: "architecture" }],
    authorName: "Yinian",
    content: [
      "Before building login, settings, and publishing, the project needs a stable content model.",
      "That model gives us one source of truth for the homepage, the post list, the post detail page, SEO metadata, and RSS output.",
    ],
  },
];

const updateSeeds = [
  {
    title: "March progress",
    slug: "march-progress",
    summary:
      "Wrapped the first pass of the public reading experience and tightened the overall page rhythm.",
    status: ContentStatus.PUBLISHED,
    publishedAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    category: {
      name: "Build Logs",
      slug: "build-logs",
    },
    tags: [
      { name: "Site", slug: "site" },
      { name: "Progress", slug: "progress" },
      { name: "Ui", slug: "ui" },
    ],
    content: [
      "The homepage and archive pages now feel much closer to the tone I wanted from the beginning: quieter, lighter, and a little more cinematic.",
      "Most of the work this week went into spacing, navigation behavior, and making the timeline interactions feel less mechanical.",
    ],
  },
  {
    title: "Admin console pass",
    slug: "admin-console-pass",
    summary:
      "Cleaned up the admin-facing shell and aligned a few rough edges before building out real workflows.",
    status: ContentStatus.PUBLISHED,
    publishedAt: "2026-03-31T00:00:00.000Z",
    updatedAt: "2026-03-31T00:00:00.000Z",
    category: {
      name: "Changelog",
      slug: "changelog",
    },
    tags: [
      { name: "Admin", slug: "admin" },
      { name: "Cleanup", slug: "cleanup" },
    ],
    content: [
      "I am still keeping the admin side intentionally small, but the shell is now stable enough to keep layering real features on top of it.",
    ],
  },
  {
    title: "Publishing flow notes",
    slug: "publishing-flow-notes",
    summary:
      "Mapped the publishing flow from local content to the future admin workflow and API layer.",
    status: ContentStatus.PUBLISHED,
    publishedAt: "2022-03-30T00:00:00.000Z",
    updatedAt: "2022-03-30T00:00:00.000Z",
    category: {
      name: "Build Logs",
      slug: "build-logs",
    },
    tags: [
      { name: "Publishing", slug: "publishing" },
      { name: "Architecture", slug: "architecture" },
    ],
    content: [
      "The useful part of this pass was not the code itself, but clarifying what the eventual editor, publish action, and public rendering pipeline should agree on.",
      "That makes the current local-content phase feel less like a prototype and more like a stable first layer.",
    ],
  },
  {
    title: "Interface tweaks",
    slug: "interface-tweaks",
    summary:
      "Adjusted small interface details so the site feels more intentional in motion and spacing.",
    status: ContentStatus.PUBLISHED,
    publishedAt: "2026-03-28T00:00:00.000Z",
    updatedAt: "2026-03-28T00:00:00.000Z",
    category: {
      name: "Notes",
      slug: "notes",
    },
    tags: [
      { name: "Design", slug: "design" },
      { name: "Refinement", slug: "refinement" },
    ],
    content: [
      "The biggest lesson again was that small spacing changes do more for the tone of the site than adding another decorative effect.",
    ],
  },
];

async function main() {
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: siteSettings,
    create: {
      id: "default",
      ...siteSettings,
    },
  });

  const avatarAsset = await prisma.asset.upsert({
    where: {
      storageKey: "local/avatar.png",
    },
    update: {
      provider: AssetProvider.LOCAL,
      kind: AssetKind.IMAGE,
      url: "/avatar.png",
      alt: "Yinian avatar",
    },
    create: {
      provider: AssetProvider.LOCAL,
      kind: AssetKind.IMAGE,
      storageKey: "local/avatar.png",
      url: "/avatar.png",
      alt: "Yinian avatar",
    },
  });

  for (const post of postSeeds) {
    const category = await upsertCategory(CategoryKind.POST, post.category);
    const tagRecords = await Promise.all(post.tags.map(upsertTag));
    const content = buildParagraphJson(post.content);
    const contentHtml = buildParagraphHtml(post.content);

    const savedPost = await prisma.post.upsert({
      where: { slug: post.slug },
      update: {
        title: post.title,
        summary: post.summary,
        status: post.status,
        content,
        contentHtml,
        authorName: post.authorName,
        publishedAt: new Date(post.publishedAt),
        categoryId: category.id,
        coverAssetId: avatarAsset.id,
      },
      create: {
        title: post.title,
        slug: post.slug,
        summary: post.summary,
        status: post.status,
        content,
        contentHtml,
        authorName: post.authorName,
        publishedAt: new Date(post.publishedAt),
        categoryId: category.id,
        coverAssetId: avatarAsset.id,
      },
    });

    await prisma.post.update({
      where: { id: savedPost.id },
      data: {
        updatedAt: new Date(post.updatedAt),
        tags: {
          deleteMany: {},
          create: tagRecords.map((tag) => ({
            tagId: tag.id,
          })),
        },
      },
    });
  }

  for (const update of updateSeeds) {
    const category = await upsertCategory(CategoryKind.UPDATE, update.category);
    const tagRecords = await Promise.all(update.tags.map(upsertTag));
    const content = buildParagraphJson(update.content);
    const contentHtml = buildParagraphHtml(update.content);

    const savedUpdate = await prisma.update.upsert({
      where: { slug: update.slug },
      update: {
        title: update.title,
        summary: update.summary,
        status: update.status,
        content,
        contentHtml,
        publishedAt: new Date(update.publishedAt),
        categoryId: category.id,
        coverAssetId: avatarAsset.id,
      },
      create: {
        title: update.title,
        slug: update.slug,
        summary: update.summary,
        status: update.status,
        content,
        contentHtml,
        publishedAt: new Date(update.publishedAt),
        categoryId: category.id,
        coverAssetId: avatarAsset.id,
      },
    });

    await prisma.update.update({
      where: { id: savedUpdate.id },
      data: {
        updatedAt: new Date(update.updatedAt),
        tags: {
          deleteMany: {},
          create: tagRecords.map((tag) => ({
            tagId: tag.id,
          })),
        },
      },
    });
  }

  console.log("Seeded site settings, posts, updates, tags, categories, and assets.");
}

function buildParagraphJson(paragraphs) {
  return {
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      content: [
        {
          type: "text",
          text,
        },
      ],
    })),
  };
}

function buildParagraphHtml(paragraphs) {
  return paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`).join("\n");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function upsertCategory(kind, category) {
  return prisma.category.upsert({
    where: {
      kind_slug: {
        kind,
        slug: category.slug,
      },
    },
    update: {
      name: category.name,
    },
    create: {
      kind,
      name: category.name,
      slug: category.slug,
    },
  });
}

async function upsertTag(tag) {
  return prisma.tag.upsert({
    where: { slug: tag.slug },
    update: {
      name: tag.name,
    },
    create: {
      name: tag.name,
      slug: tag.slug,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
