export type UpdateStatus = "draft" | "published";

export type UpdateMeta = {
  id: string;
  slug: string;
  title: string;
  href: string;
  status: UpdateStatus;
  publishedAt: string | null;
  category: string;
  summary: string;
  tags: string[];
};

export type Update = UpdateMeta & {
  content: string[];
};

export const updates: Update[] = [
  {
    id: "update_march_progress",
    slug: "march-progress",
    title: "March progress",
    href: "/updates/march-progress",
    status: "published",
    publishedAt: "2026-04-01",
    category: "build-logs",
    summary: "Wrapped the first pass of the public reading experience and tightened the overall page rhythm.",
    tags: ["site", "progress", "ui"],
    content: [
      "The homepage and archive pages now feel much closer to the tone I wanted from the beginning: quieter, lighter, and a little more cinematic.",
      "Most of the work this week went into spacing, navigation behavior, and making the timeline interactions feel less mechanical.",
    ],
  },
  {
    id: "update_admin_console_pass",
    slug: "admin-console-pass",
    title: "Admin console pass",
    href: "/updates/admin-console-pass",
    status: "published",
    publishedAt: "2026-03-31",
    category: "changelog",
    summary: "Cleaned up the admin-facing shell and aligned a few rough edges before building out real workflows.",
    tags: ["admin", "cleanup"],
    content: [
      "I am still keeping the admin side intentionally small, but the shell is now stable enough to keep layering real features on top of it.",
    ],
  },
  {
    id: "update_publishing_flow_notes",
    slug: "publishing-flow-notes",
    title: "Publishing flow notes",
    href: "/updates/publishing-flow-notes",
    status: "published",
    publishedAt: "2022-03-30",
    category: "build-logs",
    summary: "Mapped the publishing flow from local content to the future admin workflow and API layer.",
    tags: ["publishing", "architecture"],
    content: [
      "The useful part of this pass was not the code itself, but clarifying what the eventual editor, publish action, and public rendering pipeline should agree on.",
      "That makes the current local-content phase feel less like a prototype and more like a stable first layer.",
    ],
  },
  {
    id: "update_interface_tweaks",
    slug: "interface-tweaks",
    title: "Interface tweaks",
    href: "/updates/interface-tweaks",
    status: "published",
    publishedAt: "2026-03-28",
    category: "notes",
    summary: "Adjusted small interface details so the site feels more intentional in motion and spacing.",
    tags: ["design", "refinement"],
    content: [
      "The biggest lesson again was that small spacing changes do more for the tone of the site than adding another decorative effect.",
    ],
  },
];

export function getPublishedUpdates() {
  return updates
    .filter((update) => update.status === "published")
    .sort((a, b) => {
      const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bTime - aTime;
    });
}

export function getUpdateBySlug(slug: string) {
  return updates.find((update) => update.status === "published" && update.slug === slug);
}

export function getAllUpdateSlugs() {
  return getPublishedUpdates().map((update) => update.slug);
}

export function formatUpdateTerm(value: string) {
  return value
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
