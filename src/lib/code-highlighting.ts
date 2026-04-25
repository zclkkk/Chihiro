import { common, createLowlight } from "lowlight";

export const syntaxLowlight = createLowlight(common);

export const CODE_LANGUAGE_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "tsx", label: "TSX" },
  { value: "bash", label: "Bash" },
  { value: "shell", label: "Shell" },
  { value: "css", label: "CSS" },
  { value: "scss", label: "SCSS" },
  { value: "html", label: "HTML" },
  { value: "json", label: "JSON" },
  { value: "markdown", label: "Markdown" },
  { value: "python", label: "Python" },
  { value: "ruby", label: "Ruby" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "java", label: "Java" },
  { value: "php", label: "PHP" },
  { value: "sql", label: "SQL" },
  { value: "diff", label: "Diff" },
  { value: "yaml", label: "YAML" },
  { value: "plaintext", label: "Plain Text" },
] as const;

const LANGUAGE_ALIASES: Record<string, string[]> = {
  javascript: ["js", "jsx", "mjs", "cjs"],
  typescript: ["ts", "tsx"],
  shell: ["sh", "zsh", "console", "terminal"],
  xml: ["html", "xhtml", "svg"],
  markdown: ["md", "mdx"],
  yaml: ["yml"],
  plaintext: ["text", "txt", "plain"],
  csharp: ["cs"],
  objectivec: ["objc"],
};

for (const [language, aliases] of Object.entries(LANGUAGE_ALIASES)) {
  const availableAliases = aliases.filter((alias) => !syntaxLowlight.registered(alias));

  if (availableAliases.length > 0) {
    syntaxLowlight.registerAlias(language, availableAliases);
  }
}

type LowlightRoot = {
  children: LowlightNode[];
  data?: {
    language?: string;
  };
};

type LowlightNode = {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: LowlightNode[];
};

const CODE_BLOCK_PATTERN =
  /<pre([^>]*)>\s*<code([^>]*)>([\s\S]*?)<\/code>\s*<\/pre>/gi;

const AUTO_DETECT_LANGUAGES = [
  "bash",
  "css",
  "diff",
  "go",
  "graphql",
  "html",
  "java",
  "javascript",
  "json",
  "markdown",
  "php",
  "python",
  "ruby",
  "rust",
  "scss",
  "shell",
  "sql",
  "swift",
  "typescript",
  "xml",
  "yaml",
].filter((language) => syntaxLowlight.registered(language));

export function highlightCodeBlocksInHtml(html: string) {
  if (!html.includes("<pre")) {
    return html;
  }

  return html.replace(
    CODE_BLOCK_PATTERN,
    (match: string, preAttrs: string, codeAttrs: string, codeHtml: string) => {
      if (!codeHtml) {
        return match;
      }

      const codeText = decodeHtmlEntities(stripHtmlTags(codeHtml));
      const requestedLanguage = getCodeLanguage(preAttrs, codeAttrs);
      const { html: highlightedHtml, language } = highlightCode(codeText, requestedLanguage);
      const languageLabel = formatCodeLanguageLabel(language);
      const nextPreAttrs = language
        ? setAttribute(preAttrs, "data-language", language)
        : preAttrs;
      const nextCodeAttrs = setAttribute(
        codeAttrs,
        "class",
        getCodeClassName(codeAttrs, language),
      );

      return `<div class="code-block-shell" data-code-block-shell><div class="code-block-toolbar"><span class="code-block-language">${escapeHtml(languageLabel)}</span><button type="button" class="code-block-copy-button" data-code-copy aria-label="Copy code"><span class="code-block-copy-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></span><span data-code-copy-label>Copy</span></button></div><pre${nextPreAttrs}><code${nextCodeAttrs}>${highlightedHtml}</code></pre></div>`;
    },
  );
}

export function formatCodeLanguageLabel(language: string | null | undefined) {
  if (!language) {
    return "Code";
  }

  if (language === "xml") {
    return "HTML";
  }

  return CODE_LANGUAGE_OPTIONS.find((option) => option.value === language)?.label ?? language.toUpperCase();
}

function highlightCode(code: string, language: string | null) {
  try {
    if (language && syntaxLowlight.registered(language)) {
      const tree = syntaxLowlight.highlight(language, code) as LowlightRoot;

      return {
        html: serializeRoot(tree),
        language: tree.data?.language ?? language,
      };
    }

    const tree = syntaxLowlight.highlightAuto(code, { subset: AUTO_DETECT_LANGUAGES }) as LowlightRoot;

    return {
      html: serializeRoot(tree),
      language: tree.data?.language ?? null,
    };
  } catch {
    return {
      html: escapeHtml(code),
      language,
    };
  }
}

function serializeRoot(root: LowlightRoot) {
  return root.children.map(serializeNode).join("");
}

function serializeNode(node: LowlightNode): string {
  if (node.type === "text" && typeof node.value === "string") {
    return escapeHtml(node.value);
  }

  if (node.type === "element" && node.tagName) {
    const attrs = serializeProperties(node.properties ?? {});
    const children = (node.children ?? []).map(serializeNode).join("");

    return `<${node.tagName}${attrs}>${children}</${node.tagName}>`;
  }

  return "";
}

function serializeProperties(properties: Record<string, unknown>) {
  return Object.entries(properties)
    .map(([name, value]) => {
      if (value === null || value === undefined || value === false) {
        return "";
      }

      const attrName = name === "className" ? "class" : name;
      const attrValue = Array.isArray(value) ? value.join(" ") : String(value);

      return ` ${attrName}="${escapeAttribute(attrValue)}"`;
    })
    .join("");
}

function getCodeLanguage(preAttrs: string, codeAttrs: string) {
  const declaredLanguage =
    getAttribute(codeAttrs, "data-language") ??
    getAttribute(preAttrs, "data-language") ??
    getLanguageFromClass(getAttribute(codeAttrs, "class")) ??
    getLanguageFromClass(getAttribute(preAttrs, "class"));

  if (!declaredLanguage) {
    return null;
  }

  const normalizedLanguage = normalizeLanguage(declaredLanguage);

  return syntaxLowlight.registered(normalizedLanguage) ? normalizedLanguage : null;
}

function getLanguageFromClass(className: string | null) {
  return className?.match(/(?:^|\s)(?:language|lang)-([^\s]+)/i)?.[1] ?? null;
}

function normalizeLanguage(language: string) {
  const lowerLanguage = language.toLowerCase();
  const aliases: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    md: "markdown",
    mdx: "markdown",
    plain: "plaintext",
    sh: "shell",
    ts: "typescript",
    tsx: "typescript",
    txt: "plaintext",
    yml: "yaml",
  };

  return aliases[lowerLanguage] ?? lowerLanguage;
}

function getCodeClassName(attrs: string, language: string | null) {
  const existingClasses = getAttribute(attrs, "class")?.split(/\s+/).filter(Boolean) ?? [];
  const classes = new Set(existingClasses);

  classes.add("hljs");

  if (language) {
    classes.add(`language-${language}`);
  }

  return Array.from(classes).join(" ");
}

function getAttribute(attrs: string, name: string) {
  const pattern = new RegExp(
    `(?:^|\\s)${escapeRegExp(name)}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i",
  );
  const match = attrs.match(pattern);

  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function setAttribute(attrs: string, name: string, value: string) {
  const pattern = new RegExp(
    `\\s*${escapeRegExp(name)}(?:\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+))?`,
    "i",
  );
  const nextAttrs = attrs.replace(pattern, "").trim();

  return `${nextAttrs ? ` ${nextAttrs}` : ""} ${name}="${escapeAttribute(value)}"`;
}

function stripHtmlTags(value: string) {
  return value.replace(/<[^>]*>/g, "");
}

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    const lowerCode = code.toLowerCase();

    if (lowerCode.startsWith("#x")) {
      return decodeCodePoint(Number.parseInt(lowerCode.slice(2), 16), entity);
    }

    if (lowerCode.startsWith("#")) {
      return decodeCodePoint(Number.parseInt(lowerCode.slice(1), 10), entity);
    }

    const namedEntities: Record<string, string> = {
      amp: "&",
      apos: "'",
      gt: ">",
      lt: "<",
      nbsp: "\u00a0",
      quot: '"',
    };

    return namedEntities[lowerCode] ?? entity;
  });
}

function decodeCodePoint(codePoint: number, fallback: string) {
  if (!Number.isFinite(codePoint)) {
    return fallback;
  }

  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return fallback;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
