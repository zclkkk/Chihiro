import { getContentText } from "@/lib/content";
import { getPostPath } from "@/lib/routes";
import { canonicalUrl, siteConfig } from "@/lib/site";
import { escapeXml } from "@/lib/xml";
import {
  getPublicSiteSettings,
  isPublicSiteUnavailableError,
  isUninstalledSiteError,
  listPublicPosts,
} from "@/server/public-content";

export async function GET() {
  let posts;
  let siteSettings;

  try {
    [posts, siteSettings] = await Promise.all([listPublicPosts(), getPublicSiteSettings()]);
  } catch (error) {
    if (isUninstalledSiteError(error)) {
      return new Response("404 · Not Found", {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    if (isPublicSiteUnavailableError(error)) {
      return new Response("503 · Service Unavailable", {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    throw error;
  }

  const feedUrl = canonicalUrl("/rss.xml", siteSettings);
  const siteUrl = canonicalUrl("/", siteSettings);

  const items = posts
    .map((post) => {
      const postUrl = canonicalUrl(
        getPostPath({ slug: post.slug, categorySlug: post.category?.slug }),
        siteSettings,
      );
      const pubDate = new Date(post.publishedAt ?? Date.now()).toUTCString();
      const description = escapeXml(post.summary ?? "");
      const title = escapeXml(post.title);
      const content = post.contentHtml ?? escapeXml(getContentText(null, post.content));

      return `
        <item>
          <title>${title}</title>
          <link>${postUrl}</link>
          <guid>${postUrl}</guid>
          <pubDate>${pubDate}</pubDate>
          <description>${description}</description>
          <content:encoded><![CDATA[${content}]]></content:encoded>
        </item>`;
    })
    .join("");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(siteConfig.name)}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(siteSettings.siteDescription ?? siteConfig.description)}</description>
    <language>${siteSettings.locale ?? siteConfig.locale}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" xmlns:atom="http://www.w3.org/2005/Atom" />
    ${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
