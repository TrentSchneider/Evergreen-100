// ---------------------------------------------------------
// Initialize Scroll Shadows
// ---------------------------------------------------------

export function initScrollShadows() {
  const drawerScroll = document.querySelector(".drawer-scroll");
  const shadowTop = document.querySelector(".scroll-shadow.top");
  const shadowBottom = document.querySelector(".scroll-shadow.bottom");

  if (!drawerScroll || !shadowTop || !shadowBottom) return;

  function updateScrollShadows() {
    const { scrollTop, scrollHeight, clientHeight } = drawerScroll;

    // Top shadow
    if (scrollTop > 0) {
      shadowTop.classList.add("visible");
    } else {
      shadowTop.classList.remove("visible");
    }

    // Bottom shadow
    if (scrollTop + clientHeight < scrollHeight - 1) {
      shadowBottom.classList.add("visible");
    } else {
      shadowBottom.classList.remove("visible");
    }
  }

  // Scroll listener
  drawerScroll.addEventListener("scroll", updateScrollShadows);

  // Resize observer to keep shadows correct when content changes
  const observer = new ResizeObserver(updateScrollShadows);
  observer.observe(drawerScroll);

  // Initial update
  updateScrollShadows();
}
