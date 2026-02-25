import "fake-indexeddb/auto";

// ---------------------------------------------------------
// ResizeObserver Mock (used in scrollShadows.js)
// ---------------------------------------------------------
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = global.ResizeObserver || ResizeObserverMock;

// ---------------------------------------------------------
// matchMedia Mock (used in theme.js)
// ---------------------------------------------------------
if (!global.matchMedia) {
  global.matchMedia = () => ({
    matches: false,
    media: "",
    addEventListener() {},
    removeEventListener() {},
    onchange: null
  });
}

// ---------------------------------------------------------
// requestAnimationFrame Mock (occasionally used by UI code)
// ---------------------------------------------------------
if (!global.requestAnimationFrame) {
  global.requestAnimationFrame = cb => setTimeout(cb, 0);
}

// ---------------------------------------------------------
// cancelAnimationFrame Mock
// ---------------------------------------------------------
if (!global.cancelAnimationFrame) {
  global.cancelAnimationFrame = id => clearTimeout(id);
}
