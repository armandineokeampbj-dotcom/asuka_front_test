import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export interface PlatformSettings {
  rewards_enabled: boolean;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  rewards_enabled: false,
};

// Module-level cache so all hook instances share one fetch per session
let cached: PlatformSettings | null = null;
let fetchPromise: Promise<PlatformSettings> | null = null;

async function fetchSettings(): Promise<PlatformSettings> {
  if (cached) return cached;
  if (!fetchPromise) {
    fetchPromise = fetch(`${API_BASE}/api/platform-settings`)
      .then((r) => (r.ok ? r.json() : DEFAULT_SETTINGS))
      .then((data): PlatformSettings => {
        const result: PlatformSettings = { ...DEFAULT_SETTINGS, ...data };
        cached = result;
        return result;
      })
      .catch((): PlatformSettings => DEFAULT_SETTINGS)
      .finally(() => { fetchPromise = null; });
  }
  return fetchPromise;
}

export function invalidatePlatformSettingsCache() {
  cached = null;
}

export function usePlatformSettings() {
  const [settings, setSettings] = useState<PlatformSettings>(cached ?? DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return;
    fetchSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const refetch = async () => {
    invalidatePlatformSettingsCache();
    const s = await fetchSettings();
    setSettings(s);
    return s;
  };

  return { settings, loading, refetch };
}
