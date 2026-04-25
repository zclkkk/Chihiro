"use client";

import type { NodeViewRendererProps } from "@tiptap/core";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { CODE_LANGUAGE_OPTIONS, formatCodeLanguageLabel, syntaxLowlight } from "@/lib/code-highlighting";

export const CodeBlockLowlightWithControls = CodeBlockLowlight.extend({
  addNodeView() {
    return (props: NodeViewRendererProps) => {
      const { editor, getPos, node } = props;
      const pre = document.createElement("pre");
      const toolbar = document.createElement("div");
      const select = document.createElement("select");
      const code = document.createElement("code");

      toolbar.className = "simple-editor-code-block-toolbar";
      toolbar.contentEditable = "false";
      select.className = "simple-editor-code-language-select";
      select.setAttribute("aria-label", "Code language");

      for (const option of CODE_LANGUAGE_OPTIONS) {
        const optionElement = document.createElement("option");
        optionElement.value = option.value;
        optionElement.textContent = option.label;
        select.append(optionElement);
      }

      toolbar.append(select);
      pre.append(toolbar, code);

      const updateLanguage = (nextLanguage: string | null) => {
        const pos = typeof getPos === "function" ? getPos() : null;

        if (pos === null || pos === undefined) {
          return;
        }

        const currentNode = editor.state.doc.nodeAt(pos);

        if (!currentNode || currentNode.type.name !== "codeBlock") {
          return;
        }

        const nextAttrs = {
          ...currentNode.attrs,
          language: nextLanguage,
        };

        editor.view.dispatch(
          editor.state.tr
            .setNodeMarkup(pos, undefined, nextAttrs)
            .setMeta("preventUpdate", false),
        );
      };

      const syncLanguage = (language: unknown) => {
        select.value = typeof language === "string" && language ? language : "auto";
        select.title = formatCodeLanguageLabel(select.value === "auto" ? null : select.value);
      };

      const handleChange = () => {
        updateLanguage(select.value === "auto" ? null : select.value);
      };

      select.addEventListener("change", handleChange);
      syncLanguage(node.attrs.language);

      return {
        dom: pre,
        contentDOM: code,
        update(nextNode) {
          if (nextNode.type.name !== "codeBlock") {
            return false;
          }

          syncLanguage(nextNode.attrs.language);

          return true;
        },
        stopEvent(event) {
          return toolbar.contains(event.target as Node);
        },
        destroy() {
          select.removeEventListener("change", handleChange);
        },
      };
    };
  },
}).configure({
  lowlight: syntaxLowlight,
});
