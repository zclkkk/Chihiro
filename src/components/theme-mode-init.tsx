"use client";

import { useLayoutEffect } from "react";
import { applyStoredThemeMode } from "@/lib/theme-mode";

export function ThemeModeInit() {
  useLayoutEffect(() => {
    applyStoredThemeMode();
  }, []);

  return null;
}
