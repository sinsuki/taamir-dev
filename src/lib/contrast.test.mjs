import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { contrast } from "./contrast.mjs";

test("black on white is 21 to 1", () => {
  const ratio = contrast([0, 0, 0], [255, 255, 255]);
  assert.ok(Math.abs(ratio - 21) < 0.05, String(ratio));
});

test("the same color is 1 to 1", () => {
  assert.equal(contrast([20, 20, 20], [20, 20, 20]).toFixed(2), "1.00");
});

test("each spine label clears 4.5:1 on its swatch in light and dark", () => {
  const css = readFileSync(new URL("../styles/global.css", import.meta.url), "utf8");
  const tokens = readTokens(css);
  const rules = readRules(css);
  for (let index = 0; index < 6; index += 1) {
    for (const mode of ["light", "dark"]) {
      for (const hover of [false, true]) {
        const background = resolve(winning(rules, index, "background", hover), mode, tokens);
        const ink = resolve(winning(rules, index, "color", hover), mode, tokens);
        const ratio = contrast(oklchToRgb(background), oklchToRgb(ink));
        assert.ok(
          ratio >= 4.5,
          `spine-${index} ${mode}${hover ? " hover" : ""} is ${ratio.toFixed(2)}`,
        );
      }
    }
  }
});

function readTokens(css) {
  const tokens = {};
  for (const match of css.matchAll(/--([a-z0-9-]+)-base:\s*light-dark\(\s*(oklch\([^)]+\))\s*,\s*(oklch\([^)]+\))\s*\)/g)) {
    tokens[match[1]] = { light: parseOklch(match[2]), dark: parseOklch(match[3]) };
  }
  for (const match of css.matchAll(/--([a-z0-9-]+)-base:\s*(oklch\([^)]+\))/g)) {
    if (!tokens[match[1]]) {
      const color = parseOklch(match[2]);
      tokens[match[1]] = { light: color, dark: color };
    }
  }
  return tokens;
}

function readRules(css) {
  const rules = [];
  const at = [];
  let i = 0;
  let depth = 0;
  while (i < css.length) {
    if (css[i] === "/" && css[i + 1] === "*") {
      i = css.indexOf("*/", i) + 2;
      continue;
    }
    if (css[i] === "}") {
      depth -= 1;
      at[depth] = undefined;
      i += 1;
      continue;
    }
    if (/\s/.test(css[i])) {
      i += 1;
      continue;
    }
    let j = i;
    while (j < css.length && css[j] !== "{" && css[j] !== ";" && css[j] !== "}") j += 1;
    const prelude = css.slice(i, j).trim();
    if (css[j] === ";") {
      i = j + 1;
      continue;
    }
    if (css[j] !== "{") break;
    if (prelude.startsWith("@")) {
      at[depth] = prelude;
      depth += 1;
      i = j + 1;
      continue;
    }
    let k = j + 1;
    let nested = depth + 1;
    while (k < css.length && nested > depth) {
      if (css[k] === "{") nested += 1;
      else if (css[k] === "}") nested -= 1;
      k += 1;
    }
    const context = at.filter(Boolean).join(" ");
    if (!/prefers-color-scheme|data-theme/.test(context)) {
      rules.push({ selector: prelude, body: css.slice(j + 1, k - 1), order: rules.length });
    }
    i = k;
  }
  return rules;
}

function winning(rules, index, property, hover) {
  let best = null;
  for (const rule of rules) {
    for (const selector of rule.selector.split(",")) {
      if (!matchesSpine(selector, index, hover)) continue;
      const value = declaration(rule.body, property);
      if (!value) continue;
      const rank = specificity(selector);
      if (
        !best ||
        rank[0] > best.rank[0] ||
        (rank[0] === best.rank[0] && rank[1] > best.rank[1]) ||
        (rank[0] === best.rank[0] && rank[1] === best.rank[1] && rank[2] > best.rank[2]) ||
        (rank[0] === best.rank[0] && rank[1] === best.rank[1] && rank[2] === best.rank[2] && rule.order > best.order)
      ) {
        best = { value, rank, order: rule.order };
      }
    }
  }
  if (!best) throw new Error(`spine-${index} has no ${property}`);
  return best.value;
}

function matchesSpine(selector, index, hover) {
  const part = selector.trim();
  if (!part || part.includes("::")) return false;
  const pseudos = [...part.matchAll(/:(?![:])([a-z-]+)/g)].map((match) => match[1]);
  if (pseudos.some((name) => name !== "hover")) return false;
  if (pseudos.includes("hover") !== hover) return false;
  const plain = part.replace(/:hover/g, "");
  const classes = [...plain.matchAll(/\.([A-Za-z0-9_-]+)/g)].map((match) => match[1]);
  const element = plain.match(/(?:^|[\s>+~])([a-z]+)/)?.[1] ?? "";
  if (element && element !== "a") return false;
  const own = classes.filter((name) => name !== "band-forest");
  const allowed = new Set(["spine", `spine-${index}`]);
  if (!own.every((name) => allowed.has(name))) return false;
  if (element === "a") return classes.includes("band-forest") || own.length === 0;
  return own.length > 0;
}

function declaration(body, property) {
  for (const part of body.split(";")) {
    const match = part.match(new RegExp(`^\\s*${property}\\s*:\\s*(.+)$`));
    if (match) return match[1].trim();
  }
  return "";
}

function specificity(selector) {
  const plain = selector.replace(/:hover/g, " :hover");
  const ids = plain.match(/#[A-Za-z0-9_-]+/g)?.length ?? 0;
  const classes = (plain.match(/\.([A-Za-z0-9_-]+)/g)?.length ?? 0) + (plain.match(/:hover/g)?.length ?? 0);
  const elements = plain.match(/(?:^|[\s>+~])[a-z]+/g)?.length ?? 0;
  return [ids, classes, elements];
}

function resolve(value, mode, tokens) {
  const color = value.trim();
  if (color.startsWith("light-dark(") && color.endsWith(")")) {
    const inner = color.slice("light-dark(".length, -1);
    const split = inner.indexOf(",");
    return resolve(mode === "light" ? inner.slice(0, split) : inner.slice(split + 1), mode, tokens);
  }
  const variable = color.match(/^var\(--([a-z0-9-]+)\)$/);
  if (variable) {
    const token = tokens[variable[1]];
    if (!token) throw new Error(`missing token ${variable[1]}`);
    return token[mode];
  }
  if (color.startsWith("oklch(")) return parseOklch(color);
  throw new Error(`unresolved color ${color}`);
}

function parseOklch(value) {
  const match = value.match(/oklch\(\s*([0-9.]+)%?\s+([0-9.]+)\s+([0-9.]+)/);
  if (!match) throw new Error(`bad oklch ${value}`);
  const lightness = Number(match[1]);
  return [match[1].includes("%") || lightness > 1 ? lightness / 100 : lightness, Number(match[2]), Number(match[3])];
}

function oklchToRgb([lightness, chroma, hue]) {
  const radians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return linear.map((channel) => {
    const clipped = Math.min(1, Math.max(0, channel));
    const encoded = clipped <= 0.0031308 ? 12.92 * clipped : 1.055 * clipped ** (1 / 2.4) - 0.055;
    return Math.round(encoded * 255);
  });
}
