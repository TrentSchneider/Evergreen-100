import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { state } from "../../../src/state/state.js";
import { applyTheme, positionThemeHighlight } from "../../../src/ui/theme.js";

const matchMediaResult = {
  matches: true,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn()
};

const matchMediaMock = vi.fn(() => matchMediaResult);

describe("theme application", () => {
  beforeEach(() => {
    vi.spyOn(window, "matchMedia").mockImplementation(matchMediaMock);

    document.body.className = "";
    document.body.innerHTML = `
      <div class="theme-toggle">
        <button class="theme-option" data-theme="auto"></button>
        <button class="theme-option" data-theme="light"></button>
        <button class="theme-option" data-theme="dark"></button>
        <span id="theme-highlight"></span>
      </div>
    `;

    const options = document.querySelectorAll(".theme-option");
    options.forEach((option, index) => {
      Object.defineProperty(option, "offsetLeft", {
        value: index * 50,
        configurable: true
      });
      Object.defineProperty(option, "offsetWidth", {
        value: 40,
        configurable: true
      });
    });

    state.settings = {
      theme: "auto",
      layout: {
        settingsExpanded: false,
        tierExpanded: {},
        rowExpanded: {}
      }
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sets explicit light and dark classes", () => {
    state.settings.theme = "light";
    applyTheme();

    expect(document.body.classList.contains("theme-light")).toBe(true);
    expect(document.body.classList.contains("theme-dark")).toBe(false);

    state.settings.theme = "dark";
    applyTheme();

    expect(document.body.classList.contains("theme-dark")).toBe(true);
    expect(document.body.classList.contains("theme-light")).toBe(false);
  });

  it("respects prefers-color-scheme when auto", () => {
    matchMediaResult.matches = true;
    state.settings.theme = "auto";
    applyTheme();
    expect(document.body.classList.contains("theme-dark")).toBe(true);

    matchMediaResult.matches = false;
    applyTheme();
    expect(document.body.classList.contains("theme-light")).toBe(true);

    expect(window.matchMedia).toHaveBeenCalledWith("(prefers-color-scheme: dark)");
  });

  it("positions theme highlight based on selection", () => {
    const highlight = document.getElementById("theme-highlight");

    state.settings.theme = "dark";
    applyTheme();

    expect(highlight.style.left).toBe("100px");
    expect(highlight.style.width).toBe("40px");

    state.settings.theme = "auto";
    positionThemeHighlight();
    expect(highlight.style.left).toBe("0px");
  });
});
