/* =============================================================================
   language.js — bilingual EN/AR switcher (shared by every page)
   ============================================================================= */

const DEFAULT_LANG = "en"; // <-- change to "ar" to default the whole site to Arabic
const STORAGE_KEY = "yara-portfolio-lang";

function applyLanguage(lang) {
  const body = document.body;
  const html = document.documentElement;

  // swap the body class that style.css keys off of
  body.classList.remove("lang-en", "lang-ar");
  body.classList.add(lang === "ar" ? "lang-ar" : "lang-en");

  // fix text direction + the <html lang="..."> attribute for accessibility/SEO
  html.setAttribute("lang", lang);
  html.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");

  // update the active state on every EN/AR toggle button present on the page
  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });

  localStorage.setItem(STORAGE_KEY, lang);
}

function initLanguage() {
  const saved = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
  applyLanguage(saved);

  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => applyLanguage(btn.dataset.lang));
  });
}

document.addEventListener("DOMContentLoaded", initLanguage);
