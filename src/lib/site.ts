const defaultSiteUrl = "http://localhost:3000";

export const siteConfig = {
  name: "Chihiro",
  description: "A publishing system for stories, ideas, and product notes.",
  url: process.env.NEXT_PUBLIC_SITE_URL?.trim() || defaultSiteUrl,
  avatar: "/avatar.png",
  author: "Yinian",
  locale: "zh-CN",
  motto: "It is the time you have wasted for your rose makes your rose so important.",
  summary:
    "This is where I share projects, experiments, and reflections on building, learning, and the things that keep me curious.",
  email:"i@xiamii.com",
  github: "https://github.com/Yiniann",
};

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}
