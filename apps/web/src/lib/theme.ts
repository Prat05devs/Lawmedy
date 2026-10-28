// Day and night themes for the public site. The choice lives in this browser only.
export type Theme = "day" | "night";
export const THEME_KEY = "lawmedy:theme";

// Runs before the first paint (see the root layout) so night mode never flashes white.
// A stored choice wins; otherwise the device setting decides.
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="day"&&t!=="night")t=matchMedia("(prefers-color-scheme: dark)").matches?"night":"day";document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="day"}})()`;
