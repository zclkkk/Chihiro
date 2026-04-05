import { createSlateContentValue, renderSlateContentHtml } from "@/lib/slate-content";

type RichTextNode = {
  text?: unknown;
  content?: unknown;
  children?: unknown;
};

export function formatContentTerm(value: string) {
  return value
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getParagraphsFromContent(content: unknown): string[] {
  if (!content) {
    return [];
  }

  if (typeof content === "string") {
    const trimmed = content.trim();
    return trimmed ? [trimmed] : [];
  }

  if (Array.isArray(content)) {
    return content.flatMap((item) => {
      if (typeof item === "string") {
        const trimmed = item.trim();
        return trimmed ? [trimmed] : [];
      }

      if (!isRichTextNode(item)) {
        return [];
      }

      const nodes = Array.isArray(item.children)
        ? item.children
        : Array.isArray(item.content)
          ? item.content
          : null;

      if (!nodes) {
        if (typeof item.text === "string") {
          const trimmed = item.text.trim();
          return trimmed ? [trimmed] : [];
        }

        return [];
      }

      const text = collectText(nodes).trim();
      return text ? [text] : [];
    });
  }

  if (!isRichTextNode(content)) {
    return [];
  }

  const nodes = Array.isArray(content.children)
    ? content.children
    : Array.isArray(content.content)
      ? content.content
      : null;

  if (!nodes) {
    if (typeof content.text === "string") {
      const trimmed = content.text.trim();
      return trimmed ? [trimmed] : [];
    }

    return [];
  }

  const text = collectText(nodes).trim();
  return text ? [text] : [];
}

export function stripHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function getContentText(contentHtml: string | null, content: unknown) {
  if (contentHtml) {
    const text = stripHtml(contentHtml);

    if (text) {
      return text;
    }
  }

  return getParagraphsFromContent(content).join(" ");
}

export function getContentPreview(contentHtml: string | null, content: unknown) {
  return getContentText(contentHtml, content) || "No preview available yet.";
}

export function getRenderedContentHtml(contentHtml: string | null, content: unknown) {
  if (typeof contentHtml === "string" && contentHtml.trim()) {
    return contentHtml;
  }

  if (typeof content === "string") {
    return renderPlainTextContentHtml(content);
  }

  if (Array.isArray(content)) {
    const rendered = renderSlateContentHtml(createSlateContentValue(content));
    return rendered || null;
  }

  const paragraphs = getParagraphsFromContent(content);
  return paragraphs.length === 0 ? null : renderParagraphsAsHtml(paragraphs);
}

export function renderPlainTextContentHtml(content: string | null) {
  if (!content) {
    return null;
  }

  const blocks = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return null;
  }

  const renderedBlocks = blocks.flatMap((block) => renderTextBlock(block));

  return renderedBlocks.join("");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderParagraphsAsHtml(paragraphs: string[]) {
  return paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function renderTextBlock(block: string) {
  const lines = block
    .split(/\n+/)
    .map((line) => normalizeLine(line))
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  return lines.flatMap((line) => {
    const heading = renderHeadingLine(line);

    if (heading) {
      return [heading];
    }

    const image = renderImageLine(line);

    if (image) {
      return [image];
    }

    return [`<p>${escapeHtml(line).replace(/\n/g, "<br />")}</p>`];
  });
}

function renderHeadingLine(line: string) {
  const match = line.match(/^(#{1,3})\s+(.+)$/);

  if (!match) {
    return null;
  }

  const level = match[1].length;
  const content = escapeHtml(match[2]);
  const className =
    level === 1
      ? "mt-10 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
      : level === 2
        ? "mt-8 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
        : "mt-6 text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50";

  return `<h${level} class="${className}">${content}</h${level}>`;
}

function renderImageLine(line: string) {
  const markdownImageMatch = line.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/);

  if (markdownImageMatch) {
    return renderImage(markdownImageMatch[2], markdownImageMatch[1] || "Image");
  }

  if (isExternalImageUrl(line)) {
    return renderImage(line, "Image");
  }

  return null;
}

function renderImage(src: string, alt: string) {
  return [
    `<figure class="my-8 overflow-hidden rounded-2xl border border-zinc-200/70 bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-900">`,
    `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" class="block h-auto w-full" loading="lazy" decoding="async" />`,
    `</figure>`,
  ].join("");
}

function isExternalImageUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false;
  }

  return /\.(avif|gif|jpe?g|png|webp|svg)$/i.test(url.pathname);
}

function normalizeLine(value: string) {
  return value.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\u00A0/g, " ").trim();
}

function collectText(nodes: unknown[]) {
  const textParts: string[] = [];

  for (const node of nodes) {
    if (typeof node === "string") {
      textParts.push(node);
      continue;
    }

    if (!isRichTextNode(node)) {
      continue;
    }

    if (typeof node.text === "string") {
      textParts.push(node.text);
    }

    if (Array.isArray(node.content)) {
      const nestedText = collectText(node.content);

      if (nestedText) {
        textParts.push(nestedText);
      }
    }

    if (Array.isArray((node as { children?: unknown[] }).children)) {
      const nestedText = collectText((node as { children: unknown[] }).children);

      if (nestedText) {
        textParts.push(nestedText);
      }
    }
  }

  return textParts.join("");
}

function isRichTextNode(value: unknown): value is RichTextNode {
  return typeof value === "object" && value !== null;
}

export function escapeHtmlText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
