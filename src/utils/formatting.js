import { EvergreenConfig } from "../data/config.js";

// ---------------------------------------------------------
// Value Formatting
// ---------------------------------------------------------

export function formatValue(ex, value) {
  if (ex.type === "time") {
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
  console.log(ex);

  return String(value);
}

export function parseValue(ex, text) {
  if (ex.type === "time") {
    const [m, s] = text.split(":").map(Number);
    return (m || 0) * 60 + (s || 0);
  }
  const n = Number(text);
  return isNaN(n) ? 0 : n;
}

export function formatTotal(ex) {
  if (ex.type !== "time") return String(ex.total);
  const minutes = Math.floor(ex.total / 60);
  const seconds = ex.total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// ---------------------------------------------------------
// Completion & Remaining
// ---------------------------------------------------------

export function remaining(ex, value) {
  const rem = ex.total - value;

  if (ex.type === "time") {
    const r = Math.max(rem, 0);
    const minutes = Math.floor(r / 60);
    const seconds = r % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")} remaining`;
  }

  if (value < ex.total) return `${ex.total - value} remaining`;
  if (value === ex.total) return "Complete";
  return "Over";
}

export function completionRatio(ex, value) {
  return value / ex.total;
}

export function completionClass(ex, value) {
  const ratio = value / ex.total;
  const t = EvergreenConfig.thresholds;

  if (ratio === 0) return "neutral";
  if (ratio < t.approaching) return "neutral";
  if (ratio < t.complete) return "approaching";
  if (ratio < t.over) return "complete";
  return "over";
}
