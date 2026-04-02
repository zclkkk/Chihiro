export type UpdateStatus = "draft" | "published";

export type UpdateMeta = {
  id: string;
  title: string;
  href: string;
  status: UpdateStatus;
  publishedAt: string | null;
  category: string;
};

export const updates: UpdateMeta[] = [
  {
    id: "update_march_progress",
    title: "March progress",
    href: "/updates?category=build-logs",
    status: "published",
    publishedAt: "2026-04-01",
    category: "build-logs",
  },
  {
    id: "update_admin_console_pass",
    title: "Admin console pass",
    href: "/updates?category=changelog",
    status: "published",
    publishedAt: "2026-03-31",
    category: "changelog",
  },
  {
    id: "update_publishing_flow_notes",
    title: "Publishing flow notes",
    href: "/updates?category=build-logs",
    status: "published",
    publishedAt: "2026-03-30",
    category: "build-logs",
  },
  {
    id: "update_interface_tweaks",
    title: "Interface tweaks",
    href: "/updates?category=notes",
    status: "published",
    publishedAt: "2026-03-28",
    category: "notes",
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

export function formatUpdateTerm(value: string) {
  return value
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
