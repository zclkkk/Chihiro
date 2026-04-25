"use client";

import { useEffect } from "react";

export function CodeBlockCopyController() {
  useEffect(() => {
    const handleClick = async (event: MouseEvent) => {
      const button = (event.target as Element | null)?.closest<HTMLButtonElement>("[data-code-copy]");

      if (!button) {
        return;
      }

      const shell = button.closest<HTMLElement>("[data-code-block-shell]");
      const code = shell?.querySelector<HTMLElement>("pre code");
      const text = code?.innerText ?? "";

      if (!text) {
        return;
      }

      try {
        await navigator.clipboard.writeText(text);
        setCopyButtonState(button, "已复制");
      } catch {
        setCopyButtonState(button, "复制失败");
      }
    };

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, []);

  return null;
}

function setCopyButtonState(button: HTMLButtonElement, label: string) {
  const labelElement = button.querySelector<HTMLElement>("[data-code-copy-label]");
  const originalLabel = button.dataset.copyLabel || labelElement?.textContent || button.textContent || "Copy";

  button.dataset.copyLabel = originalLabel;

  if (labelElement) {
    labelElement.textContent = label;
  } else {
    button.textContent = label;
  }

  window.setTimeout(() => {
    if (labelElement) {
      labelElement.textContent = originalLabel;
    } else {
      button.textContent = originalLabel;
    }
  }, 1400);
}
