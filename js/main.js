/* =============================================================================
   main.js — general site behavior shared by every page
   handles ONE thing: the mobile hamburger menu 
   ============================================================================= */

function initMobileNav() {
  const toggleBtn = document.getElementById("navToggleBtn");
  const navLinks = document.getElementById("navLinks");
  if (!toggleBtn || !navLinks) return; // page has no nav 

  toggleBtn.addEventListener("click", () => {
    navLinks.classList.toggle("open");
  });

  // auto-close the mobile menu once a link is tapped
  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => navLinks.classList.remove("open"));
  });
}

document.addEventListener("DOMContentLoaded", initMobileNav);
