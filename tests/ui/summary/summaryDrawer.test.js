import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { initSummaryUI } from "../../../src/ui/summary.js";

const nativeAddEventListener = EventTarget.prototype.addEventListener;
let pillHandler = null;

describe("summary drawer interactions", () => {
  beforeEach(() => {
    pillHandler = null;
    vi.spyOn(HTMLElement.prototype, "addEventListener").mockImplementation(
      function (type, listener, options) {
        if (this.id === "summary-pill" && type === "click") {
          pillHandler = listener;
        }
        return nativeAddEventListener.call(this, type, listener, options);
      }
    );

    document.body.style.overflow = "";
    document.body.innerHTML = `
      <div id="summary-container">
        <div id="summary-pill"></div>
        <div id="summary-drawer">
          <div id="summary-drawer-content"></div>
        </div>
      </div>
      <div class="pill-progress-fill"></div>
      <div class="pill-percent"></div>
    `;

    const content = document.getElementById("summary-drawer-content");
    Object.defineProperty(content, "scrollHeight", {
      value: 320,
      configurable: true
    });

    initSummaryUI();
  });

  afterEach(() => {
    if (pillHandler && document.body.style.overflow === "hidden") {
      const pill = document.getElementById("summary-pill");
      if (pill) {
        pillHandler.call(pill);
      }
    }
    vi.restoreAllMocks();
  });

  it("expands drawer on pill click", () => {
    const pill = document.getElementById("summary-pill");
    const container = document.getElementById("summary-container");
    const drawer = document.getElementById("summary-drawer");

    expect(pillHandler).toBeTypeOf("function");
    pillHandler.call(pill);

    expect(container.classList.contains("expanded")).toBe(true);
    expect(drawer.style.maxHeight).toBe("320px");
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("restores page scrolling when collapsed", () => {
    const pill = document.getElementById("summary-pill");
    const drawer = document.getElementById("summary-drawer");

    expect(pillHandler).toBeTypeOf("function");
    pillHandler.call(pill);
    pillHandler.call(pill);

    expect(drawer.style.maxHeight).toBe("0px");
    expect(document.body.style.overflow).toBe("");
  });
});
