/* =============================================================================
   animations.js — scroll-reveal for any element marked data-animate
   ============================================================================= */

function initScrollReveal() {
  const items = document.querySelectorAll("[data-animate]");
  if (!items.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target); // reveal once, then stop watching it
        }
      });
    },
    { threshold: 0.15 }
  );

  items.forEach((item) => observer.observe(item));
}

document.addEventListener("DOMContentLoaded", initScrollReveal);
