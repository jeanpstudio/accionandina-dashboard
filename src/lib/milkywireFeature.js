/**
 * Interruptor global Milkywire (solo cliente).
 * Por defecto activado para no cambiar el comportamiento existente hasta que lo desactives en Supervisión.
 */
export const MILKYWIRE_FEATURE_STORAGE_KEY = "aa_supervision_milkywire_enabled";

export function readMilkywireFeatureEnabled() {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(MILKYWIRE_FEATURE_STORAGE_KEY);
    if (v === null) return true;
    return v === "true";
  } catch {
    return true;
  }
}

export function writeMilkywireFeatureEnabled(enabled) {
  try {
    window.localStorage.setItem(
      MILKYWIRE_FEATURE_STORAGE_KEY,
      enabled ? "true" : "false",
    );
    window.dispatchEvent(
      new CustomEvent("aa-milkywire-feature-changed", { detail: { enabled } }),
    );
  } catch {
    /* ignore */
  }
}

/** Suscripción a cambios (misma pestaña + otras pestañas vía storage). */
export function subscribeMilkywireFeatureEnabled(onChange) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onChange(readMilkywireFeatureEnabled());
  const onStorage = (e) => {
    if (e.key === MILKYWIRE_FEATURE_STORAGE_KEY) handler();
  };
  window.addEventListener("aa-milkywire-feature-changed", handler);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("aa-milkywire-feature-changed", handler);
    window.removeEventListener("storage", onStorage);
  };
}
