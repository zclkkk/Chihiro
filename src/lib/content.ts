type RichTextNode = {
  text?: unknown;
  content?: unknown;
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
    return content.flatMap((item) => getParagraphsFromContent(item));
  }

  if (!isRichTextNode(content) || !Array.isArray(content.content)) {
    return [];
  }

  const paragraphs: string[] = [];

  for (const block of content.content) {
    if (!isRichTextNode(block) || !Array.isArray(block.content)) {
      continue;
    }

    const text = collectText(block.content).trim();

    if (text) {
      paragraphs.push(text);
    }
  }

  return paragraphs;
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
  if (contentHtml?.trim()) {
    return contentHtml;
  }

  const paragraphs = getParagraphsFromContent(content);

  if (paragraphs.length === 0) {
    return null;
  }

  return paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export function renderPlainTextContentHtml(content: string | null) {
  if (!content) {
    return null;
  }

  const paragraphs = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return null;
  }

  return paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
