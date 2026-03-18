import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { initScrollShadows } from "../../../src/ui/scrollShadows.js";

let resizeCallback;
const originalResizeObserver = global.ResizeObserver;

describe("scroll shadow resize reactions", () => {
  beforeEach(() => {
    resizeCallback = null;
    global.ResizeObserver = class {
      constructor(cb) {
        resizeCallback = cb;
      }
      observe() {}
      disconnect() {}
    };

    document.body.innerHTML = `
      <div class="drawer-scroll" style="height: 100px; overflow-y: auto;">
        <div style="height: 400px;"></div>
      </div>
      <div class="scroll-shadow top"></div>
      <div class="scroll-shadow bottom"></div>
    `;

    const container = document.querySelector(".drawer-scroll");
    Object.defineProperty(container, "scrollHeight", {
      value: 400,
      configurable: true
    });
    Object.defineProperty(container, "clientHeight", {
      value: 100,
      configurable: true
    });
  });

  afterEach(() => {
    global.ResizeObserver = originalResizeObserver;
  });

  it("updates visibility when content shrinks", () => {
    initScrollShadows();

    const bottom = document.querySelector(".scroll-shadow.bottom");
    expect(bottom.classList.contains("visible")).toBe(true);

    const container = document.querySelector(".drawer-scroll");
    Object.defineProperty(container, "scrollHeight", {
      value: 100,
      configurable: true
    });

    resizeCallback();

    expect(bottom.classList.contains("visible")).toBe(false);
  });
});
