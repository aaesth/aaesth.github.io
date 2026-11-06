// loaded in <head> without defer so the saved accent is applied before the page paints
window.THEMES = {
  purple: ["#cba6f7", "#6f5a8e", "#e2d2fb"],
  green:  ["#7fd88f", "#3f7a4b", "#c6f2cd"],
  red:    ["#f07a7a", "#8a3c3c", "#f9c7c7"],
  blue:   ["#7fb4f5", "#3d5f8c", "#c9def9"],
  orange: ["#f2a65e", "#8a5a2c", "#f8d6b4"],
};
window.applyTheme = function (name) {
  const t = window.THEMES[name] || window.THEMES.purple;
  const s = document.documentElement.style;
  s.setProperty("--accent", t[0]);
  s.setProperty("--accent-lo", t[1]);
  s.setProperty("--accent-hi", t[2]);
  document.documentElement.dataset.theme = window.THEMES[name] ? name : "purple";
};
try { window.applyTheme(localStorage.getItem("theme") || "purple"); } catch (e) { window.applyTheme("purple"); }
