import { describe, it, expect, beforeEach } from "vitest";
import { initScrollShadows } from "../../src/ui/scrollShadows.js";

describe("scroll shadows", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="drawer-scroll" style="height: 100px; overflow-y: auto;">
        <div style="height: 500px;"></div>
      </div>
      <div class="scroll-shadow top"></div>
      <div class="scroll-shadow bottom"></div>
    `;

    const container = document.querySelector(".drawer-scroll");

    // JSDOM does NOT compute layout — we must define these manually
    Object.defineProperty(container, "scrollHeight", { value: 500 });
    Object.defineProperty(container, "clientHeight", { value: 100 });
  });

  it("shows bottom shadow when scrollable", () => {
    initScrollShadows();

    const bottom = document.querySelector(".scroll-shadow.bottom");
    expect(bottom.classList.contains("visible")).toBe(true);
  });

  it("shows top shadow after scrolling", () => {
    const container = document.querySelector(".drawer-scroll");

    initScrollShadows();

    container.scrollTop = 50;
    container.dispatchEvent(new Event("scroll"));

    const top = document.querySelector(".scroll-shadow.top");
    expect(top.classList.contains("visible")).toBe(true);
  });
});
