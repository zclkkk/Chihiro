export const THEME_MODE_STORAGE_KEY = "chihiro-theme-mode";
export const THEME_MODE_EVENT = "chihiro-theme-mode-change";

export const themeModes = ["light", "dark"] as const;
export const themeModePreferences = ["system", "light", "dark"] as const;

export type ThemeMode = (typeof themeModes)[number];
export type ThemeModePreference = (typeof themeModePreferences)[number];

export function getThemeMode(value?: string | null): ThemeMode {
  return value === "dark" ? "dark" : "light";
}

export function getThemeModePreference(value?: string | null): ThemeModePreference {
  if (value === "dark" || value === "light") {
    return value;
  }

  return "system";
}

export function getSystemThemeMode() {
  if (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark" as ThemeMode;
  }

  return "light" as ThemeMode;
}

export function resolveThemeMode(preference: ThemeModePreference) {
  return preference === "system" ? getSystemThemeMode() : preference;
}

export function readStoredThemeModePreference() {
  if (typeof window === "undefined") {
    return "system" as ThemeModePreference;
  }

  return getThemeModePreference(window.localStorage.getItem(THEME_MODE_STORAGE_KEY));
}

export function readStoredThemeMode() {
  return resolveThemeMode(readStoredThemeModePreference());
}

export function applyStoredThemeMode() {
  if (typeof document === "undefined") {
    return;
  }

  const preference = readStoredThemeModePreference();
  const mode = resolveThemeMode(preference);

  document.documentElement.dataset.theme = mode;
  document.documentElement.dataset.themePreference = preference;
}

export function setThemeModePreference(mode: string) {
  const nextPreference = getThemeModePreference(mode);
  const nextMode = resolveThemeMode(nextPreference);

  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = nextMode;
    document.documentElement.dataset.themePreference = nextPreference;
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, nextPreference);
    window.dispatchEvent(
      new CustomEvent(THEME_MODE_EVENT, {
        detail: nextPreference,
      }),
    );
  }

  return {
    preference: nextPreference,
    mode: nextMode,
  };
}

export function toggleThemeMode(currentMode: ThemeMode) {
  return setThemeModePreference(currentMode === "dark" ? "light" : "dark");
}

export function getThemeModeInitScript() {
  return `
    (() => {
      const storageKey = ${JSON.stringify(THEME_MODE_STORAGE_KEY)};
      const stored = window.localStorage.getItem(storageKey);
      const prefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      const nextMode = stored === "dark" || stored === "light"
        ? stored
        : stored === "system"
          ? "system"
          : "system";
      const resolvedMode = nextMode === "system"
        ? prefersDark
          ? "dark"
          : "light"
        : nextMode;

      document.documentElement.dataset.theme = resolvedMode;
      document.documentElement.dataset.themePreference = nextMode;
    })();
  `;
}
