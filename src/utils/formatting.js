// src/utils/formatting.js

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
  return value;
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
  if (ex.type !== "time") return ex.total;
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

  return `${Math.max(rem, 0)} remaining`;
}

export function completionRatio(ex, value) {
  return Math.max(0, Math.min(1, value / ex.total));
}

export function completionClass(ex, value) {
  const ratio = value / ex.total;
  const t = EvergreenConfig.thresholds;

  if (ratio >= t.over) return "over";
  if (ratio >= t.complete) return "complete";
  if (ratio >= t.approaching) return "approaching";
  return "neutral";
}
