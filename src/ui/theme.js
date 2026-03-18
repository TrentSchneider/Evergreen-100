import { state } from "../state/state.js";

// ---------------------------------------------------------
// Apply Theme (light / dark / auto)
// ---------------------------------------------------------
export function applyTheme() {
  const mode = state.settings.theme;
  const body = document.body;

  body.classList.remove("theme-light", "theme-dark");

  if (mode === "light") {
    body.classList.add("theme-light");
  } else if (mode === "dark") {
    body.classList.add("theme-dark");
  } else {
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    body.classList.add(prefersDark ? "theme-dark" : "theme-light");
  }

  positionThemeHighlight();
}

// ---------------------------------------------------------
// Move the highlight pill under the selected theme option
// ---------------------------------------------------------
export function positionThemeHighlight() {
  const highlight = document.getElementById("theme-highlight");
  const toggle = document.querySelector(".theme-toggle");
  if (!highlight || !toggle) return;

  const options = Array.from(toggle.querySelectorAll(".theme-option"));
  if (!options.length) return;

  const mode = state.settings.theme;
  let index = 0;

  if (mode === "light") index = 1;
  if (mode === "dark") index = 2;

  const clampedIndex = Math.min(index, options.length - 1);
  const target = options[clampedIndex];

  const offset = target.offsetLeft;
  const width = target.offsetWidth;

  highlight.style.left = `${offset}px`;
  highlight.style.width = `${width}px`;
}

window.addEventListener("resize", () => {
  positionThemeHighlight();
});
