import { getContentText } from "@/lib/content";
import { getPostPath } from "@/lib/routes";
import { absoluteUrl, siteConfig } from "@/lib/site";
import { listAllPublishedPosts } from "@/server/repositories/posts";

export async function GET() {
  const posts = await listAllPublishedPosts();
  const feedUrl = absoluteUrl("/rss.xml");
  const siteUrl = absoluteUrl("/");

  const items = posts
    .map((post) => {
      const postUrl = absoluteUrl(getPostPath({ slug: post.slug, categorySlug: post.category?.slug }));
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
    <description>${escapeXml(siteConfig.description)}</description>
    <language>${siteConfig.locale}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" xmlns:atom="http://www.w3.org/2005/Atom" />
    ${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
