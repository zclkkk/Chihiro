import { Element as SlateElement, Text, type Descendant } from "slate";

export type SlateContentValue = Descendant[];

export function createSlateContentValue(input: unknown): SlateContentValue {
  if (Array.isArray(input) && input.every((node) => typeof node === "object" && node !== null)) {
    return input as unknown as SlateContentValue;
  }

  if (typeof input === "string") {
    return deserializePlainTextToSlate(input);
  }

  if (isSlateLikeElement(input) || isSlateText(input)) {
    return [input as Descendant];
  }

  return defaultSlateValue();
}

export function renderSlateContentHtml(value: SlateContentValue) {
  return value.map((node) => renderSlateNode(node)).join("");
}

function deserializePlainTextToSlate(content: string): SlateContentValue {
  const blocks = content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return defaultSlateValue();
  }

  const nodes = blocks.flatMap((block) => {
    const lines = block
      .split(/\n+/)
      .map((line) => normalizeLine(line))
      .filter(Boolean);

    if (lines.length === 0) {
      return [];
    }

    return lines.map((line) => deserializeLineToNode(line));
  });

  return nodes.length > 0 ? nodes : defaultSlateValue();
}

function deserializeLineToNode(line: string): Descendant {
  const imageMatch = line.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/);

  if (imageMatch) {
    return {
      type: "image",
      url: imageMatch[2],
      alt: imageMatch[1] || "Image",
      children: [{ text: "" }],
    } as Descendant;
  }

  if (isExternalImageUrl(line)) {
    return {
      type: "image",
      url: line,
      alt: "Image",
      children: [{ text: "" }],
    } as Descendant;
  }

  const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);

  if (headingMatch) {
    return {
      type: headingToType(headingMatch[1].length),
      children: [{ text: headingMatch[2] }],
    } as Descendant;
  }

  return {
    type: "paragraph",
    children: [{ text: line }],
  } as Descendant;
}

function renderSlateNode(node: Descendant): string {
  if (Text.isText(node)) {
    return renderSlateTextNode(node);
  }

  if (!SlateElement.isElement(node)) {
    return "";
  }

  const childrenHtml = node.children.map((child) => renderSlateNode(child)).join("");

  switch (node.type) {
    case "heading-one":
      return `<h1 class="mt-10 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">${childrenHtml}</h1>`;
    case "heading-two":
      return `<h2 class="mt-8 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">${childrenHtml}</h2>`;
    case "heading-three":
      return `<h3 class="mt-6 text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">${childrenHtml}</h3>`;
    case "block-quote":
      return `<blockquote class="border-l-2 border-zinc-200 pl-4 text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">${childrenHtml}</blockquote>`;
    case "link":
      return `<a href="${escapeHtml(node.url ?? "#")}" class="text-primary underline" rel="noreferrer noopener">${childrenHtml}</a>`;
    case "image":
      return `<figure class="my-8 overflow-hidden rounded-2xl border border-zinc-200/70 bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-900"><img src="${escapeHtml(
        node.url ?? "",
      )}" alt="${escapeHtml(typeof node.alt === "string" ? node.alt : "Image")}" class="block h-auto w-full" loading="lazy" decoding="async" /></figure>`;
    case "paragraph":
    default:
      return `<p>${childrenHtml}</p>`;
  }
}

function renderSlateTextNode(node: Text) {
  let output = escapeHtml(node.text);

  if (node.bold) {
    output = `<strong>${output}</strong>`;
  }

  if (node.italic) {
    output = `<em>${output}</em>`;
  }

  if (node.code) {
    output = `<code>${output}</code>`;
  }

  if ((node as { underline?: boolean }).underline) {
    output = `<u>${output}</u>`;
  }

  return output;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function defaultSlateValue(): SlateContentValue {
  return [
    {
      type: "paragraph",
      children: [{ text: "" }],
    } as Descendant,
  ] as unknown as SlateContentValue;
}

function normalizeLine(value: string) {
  return value.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\u00A0/g, " ").trim();
}

function headingToType(level: number) {
  if (level <= 1) {
    return "heading-one";
  }

  if (level === 2) {
    return "heading-two";
  }

  return "heading-three";
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

function isSlateLikeElement(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSlateText(value: unknown): boolean {
  return typeof value === "object" && value !== null && "text" in value;
}
