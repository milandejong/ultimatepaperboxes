const MM_TO_PX = 3;
const EXPORT_PX_PER_MM = 4;
const DECIMAL_PRECISION = 1;
const DECIMAL_FACTOR = 10 ** DECIMAL_PRECISION;
const LID_FIT_EXTRA = 0.3;

// Preset data - will be loaded from presets.json
let DIMENSION_PRESETS = [];
let COLOR_PRESETS = [];

const LAYOUT_CONSTANTS = {
  margin: 20,
  panelGHeight: 10,
  sideFlapWidth: 10,
};

const PAPER_SIZES = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
};

const STYLES = {
  cut: "stroke:#000000; stroke-width:0.35; fill:none;",
  fold: {
    mountain: "stroke:#808080; stroke-width:0.25; fill:none;",
    valley:
      "stroke:#808080; stroke-width:0.25; stroke-dasharray: 1 2; fill:none;",
  },
  text: {
    primary:
      "fill:#111827; font-size: 4px; font-family: sans-serif; text-anchor: middle; alignment-baseline: middle;",
    muted:
      "fill:rgba(17, 24, 39, 0.6); font-size: 4px; font-family: sans-serif; text-anchor: middle; alignment-baseline: middle;",
  },
};

const FOOTER_TEXT = "boxes.webmachines.nl";
const FOOTER_TARGET_WIDTH_RATIO = 0.5;
const FOOTER_GROUP_STYLE = "fill:#ea580c; opacity:0.65;";
const FOOTER_LOGO_PATH = "assets/footer-logo.svg";
let footerLogoMarkup = "";
let footerLogoWidth = 2108;
let footerLogoHeight = 114;

const COLOR_SETTINGS = {
  bleed: 4,
  panelOpacity: 1,
  flapOpacity: 1,
};
const DIMENSION_MATCH_TOLERANCE = 0.05;

function hexToRgb(hex) {
  if (!hex) {
    return null;
  }
  let normalized = hex.replace("#", "");
  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (normalized.length !== 6 || Number.isNaN(parseInt(normalized, 16))) {
    return null;
  }
  const value = parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex(r, g, b) {
  const toHex = (channel) => {
    const clamped = Math.max(0, Math.min(255, Math.round(channel)));
    return clamped.toString(16).padStart(2, "0");
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function adjustHexBrightness(hex, lighten = true, amount = 0.35) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return hex;
  }
  const target = lighten ? 255 : 0;
  const mix = (channel) => channel + (target - channel) * amount;
  return rgbToHex(mix(rgb.r), mix(rgb.g), mix(rgb.b));
}

function getPerceivedLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return 0;
  }
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgba(hex, alpha = 1) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return `rgba(0, 0, 0, ${alpha})`;
  }
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function normalizeColorValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = `${value}`.trim();
  if (!trimmed) {
    return null;
  }
  if (!normalizeColorValue._ctx) {
    const canvas = document.createElement("canvas");
    normalizeColorValue._ctx = canvas.getContext("2d");
  }
  const ctx = normalizeColorValue._ctx;
  if (!ctx) {
    return trimmed;
  }
  const sentinel = "#010203";
  ctx.fillStyle = sentinel;
  ctx.fillStyle = trimmed;
  const normalized = ctx.fillStyle;
  if (!normalized) {
    return null;
  }
  const lowerSentinel = sentinel.toLowerCase();
  if (
    normalized.toLowerCase() === lowerSentinel &&
    trimmed.toLowerCase() !== lowerSentinel
  ) {
    return null;
  }
  return normalized;
}

function normalizeToHex(value) {
  const normalized = normalizeColorValue(value);
  if (!normalized) {
    return { normalized: null, hex: null };
  }

  const trimmed = normalized.trim().toLowerCase();
  const hexFromValue = (() => {
    if (trimmed.startsWith("#")) {
      if (trimmed.length === 4) {
        const [, r, g, b] = trimmed;
        return `#${r}${r}${g}${g}${b}${b}`;
      }
      if (trimmed.length === 7) {
        return trimmed;
      }
      return null;
    }

    const rgbMatch = trimmed.match(
      /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+)\s*)?\)$/
    );
    if (rgbMatch) {
      const clampChannel = (component) => {
        const channel = Math.round(parseFloat(component));
        return Number.isFinite(channel)
          ? Math.max(0, Math.min(255, channel))
          : null;
      };
      const [r, g, b] = rgbMatch.slice(1, 4).map(clampChannel);
      if ([r, g, b].some((channel) => channel === null)) {
        return null;
      }
      const toHex = (channel) => channel.toString(16).padStart(2, "0");
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    return null;
  })();

  return {
    normalized,
    hex: hexFromValue,
  };
}

function getStyleConfig({ color, cutLineColor, foldLineColor }) {
  const base = {
    cut: STYLES.cut,
    fold: { ...STYLES.fold },
    text: { ...STYLES.text },
  };

  if (cutLineColor) {
    base.cut = `stroke:${cutLineColor}; stroke-width:0.35; fill:none;`;
  }

  if (foldLineColor) {
    base.fold.mountain = `stroke:${foldLineColor}; stroke-width:0.25; fill:none;`;
    base.fold.valley = `stroke:${foldLineColor}; stroke-width:0.25; stroke-dasharray: 1 2; fill:none;`;
  }

  if (!color) {
    return base;
  }

  const { hex: normalizedHex } = normalizeToHex(color);
  const workingColor = normalizedHex || color;
  const luminance = getPerceivedLuminance(workingColor);
  const prefersLightText = luminance < 0.5;
  const primaryColor = prefersLightText ? "#ffffff" : "#111827";
  const mutedColor = hexToRgba(primaryColor, prefersLightText ? 0.8 : 0.6);
  const accentAdjustment = prefersLightText ? 0.2 : 0.25;
  const accentColor = adjustHexBrightness(
    workingColor,
    prefersLightText,
    accentAdjustment
  );

  base.text = {
    primary: `fill:${primaryColor}; font-size: 4px; font-family: sans-serif; text-anchor: middle; alignment-baseline: middle;`,
    muted: `fill:${mutedColor}; font-size: 4px; font-family: sans-serif; text-anchor: middle; alignment-baseline: middle;`,
  };

  if (accentColor && !foldLineColor) {
    base.fold = {
      ...base.fold,
      accent: `stroke:${accentColor}; stroke-width:0.25; fill:none;`,
    };
  }

  return base;
}

function createLineElement(x1, y1, x2, y2, style) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="${style}" />`;
}

function createRectElement(x, y, width, height, style) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" style="${style}" />`;
}

function createTextElement({ x, y, content, style, rotation }) {
  const rotationAttr = rotation
    ? ` transform="rotate(${rotation} ${x} ${y})"`
    : "";
  return `<text x="${x}" y="${y}" style="${style}"${rotationAttr}>${content}</text>`;
}

function computeLayout(W, H, D, allowance, insideClearance = 4) {
  const { margin, panelGHeight, sideFlapWidth } = LAYOUT_CONSTANTS;

  const y0 = margin;
  const adjustedInsideClearance = Math.max(0, insideClearance);
  const topPanelDepth = Math.max(0, D - adjustedInsideClearance);
  const y1 = y0 + topPanelDepth;
  const y2 = y1 + H;
  const y3 = y2 + H;
  const y4 = y3 + D;
  const y5 = y4 + H;
  const y6 = y5 + H;
  const y7 = y6 + panelGHeight;

  const x0 = margin;
  const x1 = x0 + sideFlapWidth;
  const x2 = x1 + H;
  const x3 = x2 + H;
  const x4 = x3 + W;
  const x5 = x4 + H;
  const x6 = x5 + H;
  const x7 = x6 + sideFlapWidth;

  const p1p2 = {
    width: H - allowance,
    height: W - allowance,
  };

  const p3p4 = {
    width: D - allowance,
    height: H - allowance,
  };

  const flaps = {
    p1: {
      left: x4,
      right: x4 + p1p2.width,
      top: y3 - p1p2.height,
      bottom: y3,
    },
    p2: {
      left: x3 - p1p2.width,
      right: x3,
      top: y4,
      bottom: y4 + p1p2.height,
    },
    p3: {
      left: x3 - p3p4.width,
      right: x3,
      top: y3 - p3p4.height,
      bottom: y3,
    },
    p4: {
      left: x4,
      right: x4 + p3p4.width,
      top: y4,
      bottom: y4 + p3p4.height,
    },
  };

  const minX = Math.min(x0, flaps.p3.left);
  const maxX = Math.max(x7, flaps.p4.right);
  const minY = Math.min(y0, flaps.p1.top);
  const maxY = Math.max(y7, flaps.p2.bottom);

  return {
    x: { x0, x1, x2, x3, x4, x5, x6, x7 },
    y: { y0, y1, y2, y3, y4, y5, y6, y7 },
    flaps,
    viewBox: {
      x: minX - margin,
      y: minY - margin,
      width: maxX - minX + margin * 2,
      height: maxY - minY + margin * 2,
    },
  };
}

function buildFoldLines(layout, styles = STYLES) {
  const { x, y, flaps } = layout;
  const lines = [
    { x1: x.x3, y1: y.y1, x2: x.x4, y2: y.y1, style: styles.fold.valley },
    {
      x1: x.x3,
      y1: y.y2,
      x2: x.x4,
      y2: y.y2,
      style: styles.fold.mountain,
    },
    {
      x1: x.x3,
      y1: y.y3,
      x2: x.x4,
      y2: y.y3,
      style: styles.fold.mountain,
      accent: true,
    },
    {
      x1: x.x3,
      y1: y.y4,
      x2: x.x4,
      y2: y.y4,
      style: styles.fold.mountain,
      accent: true,
    },
    {
      x1: x.x3,
      y1: y.y5,
      x2: x.x4,
      y2: y.y5,
      style: styles.fold.mountain,
    },
    { x1: x.x3, y1: y.y6, x2: x.x4, y2: y.y6, style: styles.fold.valley },
    { x1: x.x1, y1: y.y3, x2: x.x1, y2: y.y4, style: styles.fold.valley },
    {
      x1: x.x2,
      y1: y.y3,
      x2: x.x2,
      y2: y.y4,
      style: styles.fold.mountain,
    },
    {
      x1: x.x5,
      y1: y.y3,
      x2: x.x5,
      y2: y.y4,
      style: styles.fold.mountain,
    },
    { x1: x.x6, y1: y.y3, x2: x.x6, y2: y.y4, style: styles.fold.valley },
    {
      x1: x.x3,
      y1: y.y3,
      x2: x.x3,
      y2: y.y4,
      style: styles.fold.mountain,
      accent: true,
    },
    {
      x1: x.x4,
      y1: y.y3,
      x2: x.x4,
      y2: y.y4,
      style: styles.fold.mountain,
      accent: true,
    },
    {
      x1: flaps.p1.left,
      y1: y.y3,
      x2: flaps.p1.right,
      y2: y.y3,
      style: styles.fold.mountain,
      accent: true,
    },
    {
      x1: flaps.p2.left,
      y1: y.y4,
      x2: flaps.p2.right,
      y2: y.y4,
      style: styles.fold.mountain,
      accent: true,
    },
    {
      x1: x.x3,
      y1: flaps.p3.top,
      x2: x.x3,
      y2: flaps.p3.bottom,
      style: styles.fold.mountain,
      accent: true,
    },
    {
      x1: x.x4,
      y1: flaps.p4.top,
      x2: x.x4,
      y2: flaps.p4.bottom,
      style: styles.fold.mountain,
      accent: true,
    },
  ];

  const grouped = { valley: [], mountain: [] };

  lines.forEach(({ x1, y1, x2, y2, style, accent }) => {
    const appliedStyle =
      accent && styles.fold?.accent ? styles.fold.accent : style;
    const markup = createLineElement(x1, y1, x2, y2, appliedStyle);
    const foldType = style === styles.fold.valley ? "valley" : "mountain";
    grouped[foldType].push(markup);
  });

  return {
    valley: grouped.valley.join("\n"),
    mountain: grouped.mountain.join("\n"),
  };
}

function buildCutPath(layout, styles = STYLES, trapezoid = false) {
  const { x, y, flaps } = layout;

  // Calculate dimensions for tapering
  const sideFlapW = x.x1 - x.x0;
  const bottomFlapH = y.y7 - y.y6;

  // For side flaps (Left/Right), the available height is y4 - y3 (Depth)
  const sideFlapHeight = y.y4 - y.y3;
  // For bottom flap, the available width is x4 - x3 (Width)
  const bottomFlapWidth = x.x4 - x.x3;

  // Calculate taper amounts
  // If trapezoid, we want 45deg, so taper = flap length.
  // But we must clamp it to half the available dimension to avoid crossing.
  const sideTaper = trapezoid ? Math.min(sideFlapW, sideFlapHeight / 2) : 0;
  const bottomTaper = trapezoid
    ? Math.min(bottomFlapH, bottomFlapWidth / 2)
    : 0;

  const commands = [
    `M ${x.x3},${y.y0}`,
    `L ${x.x4},${y.y0}`,
    `L ${x.x4},${y.y1}`,
    `L ${x.x4},${y.y2}`,
    `L ${x.x4},${y.y3}`,
    // p1 (Top Right Dust Flap)
    `L ${flaps.p1.left},${y.y3}`,
    `L ${flaps.p1.left},${flaps.p1.top}`,
    `L ${flaps.p1.right},${flaps.p1.top}`,
    `L ${flaps.p1.right},${y.y3}`,
    `L ${x.x5},${y.y3}`,
    // Right Tuck Flap (x6 to x7)
    `L ${x.x6},${y.y3}`, // Base top
    `L ${x.x7},${y.y3 + sideTaper}`, // Tip top
    `L ${x.x7},${y.y4 - sideTaper}`, // Tip bottom
    `L ${x.x6},${y.y4}`, // Base bottom
    `L ${x.x5},${y.y4}`,
    `L ${x.x4},${y.y4}`,
    // p4 (Bottom Right Dust Flap)
    `L ${x.x4},${flaps.p4.top}`,
    `L ${flaps.p4.right},${flaps.p4.top}`,
    `L ${flaps.p4.right},${flaps.p4.bottom}`,
    `L ${x.x4},${flaps.p4.bottom}`,
    `L ${x.x4},${y.y5}`,
    // Bottom Tuck Flap (y6 to y7)
    `L ${x.x4},${y.y6}`, // Base right
    `L ${x.x4 - bottomTaper},${y.y7}`, // Tip right
    `L ${x.x3 + bottomTaper},${y.y7}`, // Tip left
    `L ${x.x3},${y.y6}`, // Base left
    `L ${x.x3},${y.y5}`,
    `L ${x.x3},${y.y4}`,
    // p2 (Bottom Left Dust Flap)
    `L ${flaps.p2.right},${y.y4}`,
    `L ${flaps.p2.right},${flaps.p2.bottom}`,
    `L ${flaps.p2.left},${flaps.p2.bottom}`,
    `L ${flaps.p2.left},${y.y4}`,
    `L ${x.x2},${y.y4}`,
    // Left Tuck Flap (x0 to x1)
    `L ${x.x1},${y.y4}`, // Base bottom
    `L ${x.x0},${y.y4 - sideTaper}`, // Tip bottom
    `L ${x.x0},${y.y3 + sideTaper}`, // Tip top
    `L ${x.x1},${y.y3}`, // Base top
    `L ${x.x2},${y.y3}`,
    `L ${x.x3},${y.y3}`,
    // p3 (Top Left Dust Flap)
    `L ${x.x3},${flaps.p3.bottom}`,
    `L ${flaps.p3.left},${flaps.p3.bottom}`,
    `L ${flaps.p3.left},${flaps.p3.top}`,
    `L ${x.x3},${flaps.p3.top}`,
    `L ${x.x3},${y.y2}`,
    `L ${x.x3},${y.y1}`,
    `L ${x.x3},${y.y0}`,
    "Z",
  ];

  return `<path d="${commands.join(" ")}" style="${styles.cut}" />`;
}

function buildColorPanels(
  layout,
  color,
  {
    bleed = COLOR_SETTINGS.bleed,
    isLid = false,
    inkSave = false,
    boxHeight = 0,
    lidHeight = 0,
    allowance = 0,
  } = {}
) {
  if (!color) {
    return "";
  }

  const { x, y, flaps } = layout;
  const panelStyle = `fill:${color}; fill-opacity:${COLOR_SETTINGS.panelOpacity}; stroke:none;`;
  const flapStyle = `fill:${color}; fill-opacity:${COLOR_SETTINGS.flapOpacity}; stroke:none;`;
  const rects = [];
  const bleedDistance = Math.max(0, bleed);
  const visibleInkSaveHeight = Math.max(
    0,
    boxHeight - lidHeight + bleedDistance
  );

  const panelRects = [
    {
      id: "core",
      x: x.x3,
      y: y.y3,
      width: x.x4 - x.x3,
      height: y.y4 - y.y3,
    },
    {
      id: "top",
      x: x.x3,
      y: y.y2,
      width: x.x4 - x.x3,
      height: y.y3 - y.y2,
    },
    {
      id: "bottom",
      x: x.x3,
      y: y.y4,
      width: x.x4 - x.x3,
      height: y.y5 - y.y4,
    },
    {
      id: "left",
      x: x.x2,
      y: y.y3,
      width: x.x3 - x.x2,
      height: y.y4 - y.y3,
    },
    {
      id: "right",
      x: x.x4,
      y: y.y3,
      width: x.x5 - x.x4,
      height: y.y4 - y.y3,
    },
  ];

  panelRects.forEach(({ id, x: px, y: py, width, height }) => {
    if (!isLid && id === "core") {
      return;
    }

    if (
      !isLid &&
      inkSave &&
      (id === "left" || id === "right" || id === "top" || id === "bottom")
    ) {
      if (id === "left") {
        const colorWidth = Math.min(visibleInkSaveHeight, width);
        if (colorWidth > 0 && height > 0) {
          const colorX = px + width - colorWidth;
          rects.push(
            createRectElement(colorX, py, colorWidth, height, panelStyle)
          );
        }
      } else if (id === "right") {
        const colorWidth = Math.min(visibleInkSaveHeight, width);
        if (colorWidth > 0 && height > 0) {
          rects.push(createRectElement(px, py, colorWidth, height, panelStyle));
        }
      } else if (id === "top") {
        const colorHeight = Math.min(visibleInkSaveHeight, height);
        if (width > 0 && colorHeight > 0) {
          const colorY = py + height - colorHeight;
          rects.push(
            createRectElement(px, colorY, width, colorHeight, panelStyle)
          );
        }
      } else if (id === "bottom") {
        const colorHeight = Math.min(visibleInkSaveHeight, height);
        if (width > 0 && colorHeight > 0) {
          rects.push(createRectElement(px, py, width, colorHeight, panelStyle));
        }
      }
    } else {
      if (width > 0 && height > 0) {
        rects.push(createRectElement(px, py, width, height, panelStyle));
      }
    }
  });

  if (flaps?.p1) {
    const flapWidth = flaps.p1.right - flaps.p1.left;
    const flapHeight = flaps.p1.bottom - flaps.p1.top;
    let stripHeight = Math.min(bleedDistance, flapHeight);
    let stripWidth = flapWidth;
    let stripX = flaps.p1.left;

    if (!isLid && inkSave) {
      stripWidth = Math.min(visibleInkSaveHeight, flapWidth);
      stripX = flaps.p1.left;
    } else {
      stripX = flaps.p1.right - stripWidth;
    }

    if (stripWidth > 0 && stripHeight > 0) {
      rects.push(
        createRectElement(
          stripX,
          flaps.p1.bottom - stripHeight,
          stripWidth,
          stripHeight,
          flapStyle
        )
      );
    }
  }

  if (flaps?.p2) {
    const flapWidth = flaps.p2.right - flaps.p2.left;
    const flapHeight = flaps.p2.bottom - flaps.p2.top;
    let stripHeight = Math.min(bleedDistance, flapHeight);
    let stripWidth = flapWidth;
    let stripX = flaps.p2.left;

    if (!isLid && inkSave) {
      stripWidth = Math.min(visibleInkSaveHeight, flapWidth);
      stripX = flaps.p2.right - stripWidth;
    } else {
      stripX = flaps.p2.left;
    }

    if (stripWidth > 0 && stripHeight > 0) {
      rects.push(
        createRectElement(
          stripX,
          flaps.p2.top,
          stripWidth,
          stripHeight,
          flapStyle
        )
      );
    }
  }

  if (flaps?.p3) {
    const flapWidth = flaps.p3.right - flaps.p3.left;
    const flapHeight = flaps.p3.bottom - flaps.p3.top;
    let stripWidth = Math.min(bleedDistance, flapWidth);
    let stripHeight = flapHeight;

    if (!isLid && inkSave) {
      stripHeight = Math.min(visibleInkSaveHeight, flapHeight);
    }

    if (stripHeight > 0 && stripWidth > 0) {
      rects.push(
        createRectElement(
          flaps.p3.right - stripWidth,
          flaps.p3.bottom - stripHeight,
          stripWidth,
          stripHeight,
          flapStyle
        )
      );
    }
  }

  if (flaps?.p4) {
    const flapWidth = flaps.p4.right - flaps.p4.left;
    const flapHeight = flaps.p4.bottom - flaps.p4.top;
    let stripWidth = Math.min(bleedDistance, flapWidth);
    let stripHeight = flapHeight;

    if (!isLid && inkSave) {
      stripHeight = Math.min(visibleInkSaveHeight, flapHeight);
    }

    if (stripWidth > 0 && stripHeight > 0) {
      rects.push(
        createRectElement(
          flaps.p4.left,
          flaps.p4.top,
          stripWidth,
          stripHeight,
          flapStyle
        )
      );
    }
  }

  return rects.join("\n");
}

function buildLabels(layout, isLid, styles = STYLES, options = {}) {
  const { debugLabels = false } = options;
  const { x, y, flaps } = layout;
  const mid = (start, end) => (start + end) / 2;
  const labels = [];
  const accentPrimary = styles.text.primary;
  const accentMuted = styles.text.muted;
  const staticPrimary = STYLES.text.primary;
  const staticMuted = STYLES.text.muted;

  labels.push({
    x: mid(x.x3, x.x4),
    y: mid(y.y0, y.y1),
    content: "inside",
    style: staticPrimary,
    rotation: 0,
  });

  labels.push({
    x: mid(x.x3, x.x4),
    y: mid(y.y2, y.y3),
    content: isLid ? "back" : "front",
    style: accentPrimary,
    rotation: isLid ? 180 : 0,
  });

  labels.push({
    x: mid(x.x3, x.x4),
    y: mid(y.y3, y.y4),
    content: isLid ? "top" : "bottom",
    style: isLid ? accentPrimary : staticPrimary,
    rotation: 0,
  });

  labels.push({
    x: mid(x.x3, x.x4),
    y: mid(y.y4, y.y5),
    content: isLid ? "front" : "back",
    style: accentPrimary,
    rotation: isLid ? 0 : 180,
  });

  labels.push({
    x: mid(x.x3, x.x4),
    y: mid(y.y6, y.y7),
    content: "tuck",
    style: staticMuted,
    rotation: 180,
  });

  labels.push({
    x: mid(x.x0, x.x1),
    y: mid(y.y3, y.y4),
    content: "tuck",
    style: staticMuted,
    rotation: -90,
  });

  labels.push({
    x: mid(x.x2, x.x3),
    y: mid(y.y3, y.y4),
    content: "left",
    style: accentPrimary,
    rotation: isLid ? 90 : -90,
  });

  labels.push({
    x: mid(x.x4, x.x5),
    y: mid(y.y3, y.y4),
    content: "right",
    style: accentPrimary,
    rotation: isLid ? -90 : 90,
  });

  labels.push({
    x: mid(x.x6, x.x7),
    y: mid(y.y3, y.y4),
    content: "tuck",
    style: staticMuted,
    rotation: 90,
  });

  labels.push({
    x: mid(flaps.p1.left, flaps.p1.right),
    y: mid(flaps.p1.top, flaps.p1.bottom),
    content: "flap",
    style: staticMuted,
    rotation: 90,
  });

  labels.push({
    x: mid(flaps.p2.left, flaps.p2.right),
    y: mid(flaps.p2.top, flaps.p2.bottom),
    content: "flap",
    style: staticMuted,
    rotation: -90,
  });

  labels.push({
    x: mid(flaps.p3.left, flaps.p3.right),
    y: mid(flaps.p3.top, flaps.p3.bottom),
    content: "flap",
    style: staticMuted,
  });

  labels.push({
    x: mid(flaps.p4.left, flaps.p4.right),
    y: mid(flaps.p4.top, flaps.p4.bottom),
    content: "flap",
    style: staticMuted,
    rotation: 180,
  });

  const formattedLabels = labels.map((label, index) => {
    if (!debugLabels) {
      return label;
    }
    const sequenceIndex = index % 26;
    const repeats = Math.floor(index / 26) + 1;
    const letter = String.fromCharCode(65 + sequenceIndex).repeat(repeats);
    return { ...label, content: letter };
  });

  return formattedLabels.map(createTextElement).join("\n");
}

function buildFooterText(layout, isLid, physicalWidth) {
  if (!layout?.x || !layout?.y) {
    return "";
  }

  const { x, y } = layout;
  const footerX = (x.x3 + x.x4) / 2;
  const padding = 2;
  const panelWidth = Number.isFinite(physicalWidth)
    ? Math.max(physicalWidth, 1)
    : Math.max(x.x4 - x.x3, 1);
  const targetWidth = panelWidth * FOOTER_TARGET_WIDTH_RATIO;
  const referenceWidth = footerLogoWidth || 2108;
  const referenceHeight = footerLogoHeight || 114;
  const scale = targetWidth / referenceWidth;
  const scaledHeight = referenceHeight * scale;

  let originY;
  let rotation = 0;
  let rotateCenterY;

  if (isLid) {
    originY = y.y1 - padding - scaledHeight;
    rotation = 0;
    rotateCenterY = originY + scaledHeight / 2;
  } else {
    originY = y.y4 - padding - scaledHeight;
    rotation = 0;
    rotateCenterY = originY + scaledHeight / 2;
  }

  const originX = footerX - targetWidth / 2;

  const baseGroup = `
    <g aria-label="${FOOTER_TEXT}" transform="translate(${originX} ${originY}) scale(${scale})" style="${FOOTER_GROUP_STYLE}">
      ${footerLogoMarkup || ""}
    </g>
  `;

  if (rotation !== 0) {
    return `<g transform="rotate(${rotation} ${footerX} ${rotateCenterY})">${baseGroup}</g>`;
  }
  return baseGroup;
}

function createBoxSVG({
  width,
  height,
  depth,
  allowance,
  insideClearance = 4,
  bleed = COLOR_SETTINGS.bleed,
  isLid = false,
  showLabels = false,
  debugLabels = false,
  color = null,
  inkSave = false,
  boxHeight = 0,
  lidHeight = 0,
  cutLineColor = null,
  foldLineColor = null,
  trapezoidFlaps = false,
  paperSize = null,
}) {
  const layout = computeLayout(
    width,
    height,
    depth,
    allowance,
    insideClearance
  );
  const styles = getStyleConfig({ isLid, color, cutLineColor, foldLineColor });
  const foldLinesMarkup = buildFoldLines(layout, styles);
  const cutPathMarkup = buildCutPath(layout, styles, trapezoidFlaps);

  const valleyGroupMarkup = foldLinesMarkup?.valley
    ? `<g id="valley-fold">${foldLinesMarkup.valley}</g>`
    : "";
  const mountainGroupMarkup = foldLinesMarkup?.mountain
    ? `<g id="mountain-fold">${foldLinesMarkup.mountain}</g>`
    : "";
  const cutPathGroupMarkup = cutPathMarkup
    ? `<g id="cut-path">${cutPathMarkup}</g>`
    : "";

  const layoutPathsMarkup = [
    valleyGroupMarkup,
    mountainGroupMarkup,
    cutPathGroupMarkup,
  ]
    .filter(Boolean)
    .join("\n");
  const labelMarkup = showLabels
    ? buildLabels(layout, isLid, styles, { debugLabels })
    : "";
  const footerMarkup = buildFooterText(layout, isLid, width);
  const colorPanels = color
    ? buildColorPanels(layout, color, {
        bleed,
        isLid,
        inkSave,
        boxHeight,
        lidHeight,
        allowance,
      })
    : "";

  let widthMm = layout.viewBox.width;
  let heightMm = layout.viewBox.height;
  let viewBoxX = layout.viewBox.x;
  let viewBoxY = layout.viewBox.y;
  let viewBoxW = layout.viewBox.width;
  let viewBoxH = layout.viewBox.height;

  if (paperSize && PAPER_SIZES[paperSize]) {
    const paper = PAPER_SIZES[paperSize];
    widthMm = paper.width;
    heightMm = paper.height;

    // Center the content
    const cx = layout.viewBox.x + layout.viewBox.width / 2;
    const cy = layout.viewBox.y + layout.viewBox.height / 2;

    viewBoxX = cx - widthMm / 2;
    viewBoxY = cy - heightMm / 2;
    viewBoxW = widthMm;
    viewBoxH = heightMm;
  }

  return `
          <svg 
              version="1.1"
              width="${widthMm}mm"
              height="${heightMm}mm"
              viewBox="${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}" 
              preserveAspectRatio="xMidYMid meet"
              xmlns="http://www.w3.org/2000/svg"
              data-physical-width-mm="${layout.viewBox.width}"
              data-physical-height-mm="${layout.viewBox.height}"
          >
              <desc>
                  Layout: W=${width}, H=${height}, D=${depth}, Fold clearance=${allowance}
                  Black lines are for cutting.
                  Solid light gray lines are for mountain folds.
                  Dotted light gray lines are for valley folds.
              </desc>
            ${colorPanels ? `<g id="color-panels">${colorPanels}</g>` : ""}
              ${layoutPathsMarkup}
              <g id="labels">
                  ${labelMarkup}
              </g>
                <g id="ultimate-paper-boxes-footer">
                  ${footerMarkup}
                </g>
          </svg>
      `;
}

function downloadSVG(containerId, filename) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  const svg = container.querySelector("svg");
  if (!svg) {
    return;
  }

  const svgClone = svg.cloneNode(true);
  svgClone.removeAttribute("style");

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgClone);
  const blob = new Blob([svgString], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

async function svgToPngDataUrl(svgEl) {
  const widthMm = parseFloat(
    svgEl.getAttribute("data-physical-width-mm") || "0"
  );
  const heightMm = parseFloat(
    svgEl.getAttribute("data-physical-height-mm") || "0"
  );
  if (!widthMm || !heightMm) {
    throw new Error("Missing SVG dimensions");
  }

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgEl);
  const blob = new Blob([svgString], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas not supported");
    }
    const widthPx = Math.max(
      1,
      Math.round(widthMm * Math.max(EXPORT_PX_PER_MM, MM_TO_PX))
    );
    const heightPx = Math.max(
      1,
      Math.round(heightMm * Math.max(EXPORT_PX_PER_MM, MM_TO_PX))
    );
    canvas.width = widthPx;
    canvas.height = heightPx;
    ctx.drawImage(image, 0, 0, widthPx, heightPx);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function downloadPDF(containerId, filename) {
  const container = document.getElementById(containerId);
  const svg = container?.querySelector("svg");
  if (!svg) return;

  const getSvgDim = (key) => parseFloat(svg.getAttribute(key));

  // Try standard attributes first, fallback to data attributes
  // We check both to ensure we don't mix coordinate systems (e.g. paper vs content)
  let widthMm = getSvgDim("width");
  let heightMm = getSvgDim("height");

  if (!widthMm || !heightMm) {
    widthMm = getSvgDim("data-physical-width-mm") || 0;
    heightMm = getSvgDim("data-physical-height-mm") || 0;
  }

  if (!widthMm || !heightMm) return;

  const jsPdfCtor = window.jspdf?.jsPDF;
  if (!jsPdfCtor) {
    console.error("jsPDF not loaded");
    return;
  }

  const selectedPaper = paperSizeSelect?.value ?? "A4";
  const paperSize = PAPER_SIZES[selectedPaper];
  const pageSize = paperSize
    ? [paperSize.width, paperSize.height]
    : [widthMm, heightMm];
  const pdf = new jsPdfCtor({
    unit: "mm",
    format: pageSize,
    orientation: pageSize[0] >= pageSize[1] ? "landscape" : "portrait",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const x = (pageWidth - widthMm) / 2;
  const y = (pageHeight - heightMm) / 2;

  const svgClone = svg.cloneNode(true);
  svgClone.removeAttribute("style");
  const renderOptions = {
    x,
    y,
    width: widthMm,
    height: heightMm,
    preserveAspectRatio: "xMidYMid meet",
  };

  if (window.svg2pdf && typeof window.svg2pdf === "function") {
    await window.svg2pdf(svgClone, pdf, renderOptions);
  } else if (pdf.svg && typeof pdf.svg === "function") {
    await pdf.svg(svgClone, renderOptions);
  } else {
    console.error("svg2pdf plugin not loaded; cannot create vector PDF");
    return;
  }
  const pdfName = (filename || buildPdfFilename()).replace(/\.svg$/i, ".pdf");
  pdf.save(pdfName);
}

const widthInput = document.getElementById("width");
const depthInput = document.getElementById("depth");
const heightInput = document.getElementById("height");
const lidHeightInput = document.getElementById("lidHeight");
const allowanceInput = document.getElementById("allowance");
const bleedInput = document.getElementById("bleed");
const insideClearanceInput = document.getElementById("insideClearance");
const trapezoidFlapsInput = document.getElementById("trapezoidFlaps");
const cutLineColorInput = document.getElementById("cutLineColor");
const foldLineColorInput = document.getElementById("foldLineColor");
const boxColorPicker = document.getElementById("boxColorPicker");
const boxColorText = document.getElementById("boxColorText");
const showLabelsInput = document.getElementById("showLabels");
const inkSaveInput = document.getElementById("inkSave");
const dimensionPresetSelect = document.getElementById("dimensionPreset");
const colorPresetSelect = document.getElementById("colorPreset");
const paperSizeSelect = document.getElementById("paperSize");
const svgContainerBox = document.getElementById("svg-container-box");
const svgContainerLid = document.getElementById("svg-container-lid");
const MAX_PREVIEW_MM = 200;

function parsePresetNumber(option, key) {
  if (!option?.dataset?.[key]) {
    return null;
  }
  const value = parseFloat(option.dataset[key]);
  return Number.isFinite(value) ? value : null;
}

function extractDimensionPreset(option) {
  if (!option) {
    return null;
  }
  const width = parsePresetNumber(option, "width");
  const depth = parsePresetNumber(option, "depth");
  const height = parsePresetNumber(option, "height");
  const lidHeight = parsePresetNumber(option, "lidHeight");
  if ([width, depth, height, lidHeight].some((value) => value === null)) {
    return null;
  }
  return { width, depth, height, lidHeight };
}

function approxEqual(a, b, tolerance = DIMENSION_MATCH_TOLERANCE) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return false;
  }
  return Math.abs(a - b) <= tolerance;
}

function syncDimensionPresetSelection() {
  if (!dimensionPresetSelect) {
    return;
  }
  const current = {
    width: parseInputValue(widthInput, NaN),
    depth: parseInputValue(depthInput, NaN),
    height: parseInputValue(heightInput, NaN),
    lidHeight: parseInputValue(lidHeightInput, NaN),
  };
  const matchingOption = Array.from(dimensionPresetSelect.options).find(
    (option) => {
      const preset = extractDimensionPreset(option);
      if (!preset) {
        return false;
      }
      return (
        approxEqual(current.width, preset.width) &&
        approxEqual(current.depth, preset.depth) &&
        approxEqual(current.height, preset.height) &&
        approxEqual(current.lidHeight, preset.lidHeight)
      );
    }
  );
  dimensionPresetSelect.value = matchingOption ? matchingOption.value : "";
  if (window.syncPresetChipStates) {
    window.syncPresetChipStates();
  }
}

function setPresetNumericValue(input, value) {
  if (!input || !Number.isFinite(value)) {
    return;
  }
  const rounded = Math.round(value * DECIMAL_FACTOR) / DECIMAL_FACTOR;
  input.value = rounded.toFixed(DECIMAL_PRECISION);
}

function applyDimensionPreset(option) {
  const preset = extractDimensionPreset(option);
  if (!preset) {
    return;
  }
  setPresetNumericValue(widthInput, preset.width);
  setPresetNumericValue(depthInput, preset.depth);
  setPresetNumericValue(heightInput, preset.height);
  setPresetNumericValue(lidHeightInput, preset.lidHeight);
  syncDimensionPresetSelection();
  scheduleGenerate();
}

function getOptionHex(option) {
  const raw = option?.dataset?.color;
  if (!raw) {
    return null;
  }
  const { hex } = normalizeToHex(raw);
  return hex ? hex.toLowerCase() : null;
}

function getActiveColorHex() {
  const fromText = boxColorText ? normalizeToHex(boxColorText.value) : null;
  if (fromText?.hex) {
    return fromText.hex.toLowerCase();
  }
  const fromPicker = boxColorPicker
    ? normalizeToHex(boxColorPicker.value)
    : null;
  if (fromPicker?.hex) {
    return fromPicker.hex.toLowerCase();
  }
  return null;
}

function syncColorPresetSelection() {
  if (!colorPresetSelect) {
    return;
  }

  if (colorPresetSelect.value === "transparent") {
    if (window.syncPresetChipStates) {
      window.syncPresetChipStates();
    }
    return;
  }

  const activeHex = getActiveColorHex();
  if (!activeHex) {
    if (colorPresetSelect.value !== "") {
      colorPresetSelect.value = "";
    }
    if (window.syncPresetChipStates) {
      window.syncPresetChipStates();
    }
    return;
  }

  const match = Array.from(colorPresetSelect.options).find((option) => {
    const optionHex = getOptionHex(option);
    return optionHex ? optionHex === activeHex : false;
  });
  colorPresetSelect.value = match ? match.value : "";
  if (window.syncPresetChipStates) {
    window.syncPresetChipStates();
  }
}

function applyColorPreset(option) {
  const presetHex = getOptionHex(option);
  if (!presetHex) {
    if (colorPresetSelect.value === "transparent") {
      if (foldLineColorInput) foldLineColorInput.value = "#808080";
      updateColorInputsState();
      scheduleGenerate();
    }
    return;
  }

  updateColorInputsState();
  if (boxColorPicker) {
    boxColorPicker.value = presetHex;
  }
  if (boxColorText) {
    boxColorText.value = presetHex;
  }
  updateFoldLineColorInput(presetHex);
  syncColorPresetSelection();
  scheduleGenerate();
}

function getSelectedOptionLabel(selectEl, fallback) {
  if (!selectEl) {
    return fallback;
  }
  const option = selectEl.selectedOptions?.[0];
  if (!option) {
    return fallback;
  }
  const label = option.textContent?.trim();
  return label || fallback;
}

function describeCustomDimensions() {
  const width = parseInputValue(widthInput, NaN);
  const depth = parseInputValue(depthInput, NaN);
  const height = parseInputValue(heightInput, NaN);
  const lidHeight = parseInputValue(lidHeightInput, NaN);
  if (
    [width, depth, height, lidHeight].some((value) => !Number.isFinite(value))
  ) {
    return "Custom dimensions";
  }
  const format = (value) =>
    (Math.round(value * DECIMAL_FACTOR) / DECIMAL_FACTOR)
      .toFixed(DECIMAL_PRECISION)
      .replace(/\.0$/, "");
  return `${format(width)}x${format(depth)}x${format(height)}x${format(
    lidHeight
  )}`;
}

function describeCustomColor() {
  const selectedOption = colorPresetSelect.selectedOptions[0];
  if (selectedOption && selectedOption.value === "transparent") {
    return "Transparent";
  }
  const hex = getActiveColorHex();
  return hex ? hex.toUpperCase() : "Custom color";
}

function sanitizeFilenameSegment(text) {
  if (!text) {
    return "";
  }
  return text
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDownloadFilename(type = "box") {
  let dimensionLabel;
  if (dimensionPresetSelect?.value) {
    const option = dimensionPresetSelect.selectedOptions?.[0];
    const presetName = option?.textContent?.trim();
    const groupName =
      option?.parentElement?.tagName === "OPTGROUP"
        ? option.parentElement.label
        : null;
    dimensionLabel = groupName
      ? `${groupName} - ${presetName}`
      : presetName || "Custom dimensions";
  } else {
    dimensionLabel = describeCustomDimensions();
  }

  const colorLabel = colorPresetSelect?.value
    ? getSelectedOptionLabel(colorPresetSelect, describeCustomColor())
    : describeCustomColor();

  const typeLabel = type === "lid" ? "Lid" : "Box";
  const segments = [
    "UltimatePaperBoxes",
    dimensionLabel,
    colorLabel,
    typeLabel,
  ];

  const cleaned = segments
    .map(sanitizeFilenameSegment)
    .filter((segment) => segment.length > 0);
  const base = cleaned.join(" - ");
  return `${base}.svg`;
}

function buildPdfFilename(type = "box") {
  return buildDownloadFilename(type).replace(/\.svg$/i, ".pdf");
}

const debugLabelsEnabled = (() => {
  if (typeof window === "undefined" || typeof window.location === "undefined") {
    return false;
  }
  try {
    const params = new URLSearchParams(window.location.search || "");
    return params.get("debug") === "1";
  } catch (error) {
    return false;
  }
})();

let pendingRenderFrame = null;
function scheduleGenerate() {
  if (pendingRenderFrame !== null) {
    return;
  }
  pendingRenderFrame = window.requestAnimationFrame(() => {
    pendingRenderFrame = null;
    saveSettings();
    generateBox();
  });
}

function parseInputValue(input, fallback) {
  const parsed = parseFloat(input?.value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampToInputMin(value, input) {
  if (!input) {
    return value;
  }
  const min = parseFloat(input.min);
  if (Number.isFinite(min)) {
    return Math.max(value, min);
  }
  return value;
}

function setNumericInputValue(input, value, fallback = 0) {
  if (!input) {
    return value;
  }
  const resolved = Number.isFinite(value) ? value : fallback;
  const clamped = clampToInputMin(resolved, input);
  const rounded = Math.round(clamped * DECIMAL_FACTOR) / DECIMAL_FACTOR;
  if (document.activeElement !== input) {
    input.value = rounded.toFixed(DECIMAL_PRECISION);
  }
  return rounded;
}

function updateColorInputsState() {
  const isTransparent =
    colorPresetSelect && colorPresetSelect.value === "transparent";
  const isCustom = colorPresetSelect && colorPresetSelect.value === "";
  const shouldDisable = isTransparent;

  if (boxColorPicker) {
    boxColorPicker.disabled = shouldDisable;
  }
  if (boxColorText) {
    boxColorText.disabled = shouldDisable;
  }
  if (inkSaveInput) {
    inkSaveInput.disabled = shouldDisable;
  }

  if (isCustom) {
    if (boxColorPicker) {
      boxColorPicker.disabled = false;
    }
    if (boxColorText) {
      boxColorText.disabled = false;
    }
    if (inkSaveInput) {
      inkSaveInput.disabled = false;
    }
  }
}

function resolveSelectedColor() {
  const isTransparent =
    colorPresetSelect && colorPresetSelect.value === "transparent";
  if (isTransparent) {
    return null;
  }

  const manualValue = normalizeColorValue(boxColorText?.value);
  if (manualValue) {
    return manualValue;
  }
  const pickerValue = normalizeColorValue(boxColorPicker?.value);
  if (pickerValue) {
    return pickerValue;
  }
  return null;
}

function updateFoldLineColorInput(color) {
  if (!foldLineColorInput || !color) {
    return;
  }
  const { hex: normalizedHex } = normalizeToHex(color);
  const workingColor = normalizedHex || color;
  if (!workingColor) return;

  const luminance = getPerceivedLuminance(workingColor);
  const prefersLightText = luminance < 0.5;
  const accentAdjustment = prefersLightText ? 0.2 : 0.25;
  const accentColor = adjustHexBrightness(
    workingColor,
    prefersLightText,
    accentAdjustment
  );

  if (accentColor) {
    foldLineColorInput.value = accentColor;
  }
}

function syncLinkedDimensions() {
  const allowance = parseInputValue(allowanceInput, 1);
  setNumericInputValue(allowanceInput, allowance, 1);
  const baseWidth = parseInputValue(widthInput, 60);
  setNumericInputValue(widthInput, baseWidth, 60);

  const baseDepth = parseInputValue(depthInput, 46);
  setNumericInputValue(depthInput, baseDepth, 46);

  return {
    lidWidth: baseWidth + allowance + LID_FIT_EXTRA,
    lidDepth: baseDepth + allowance + LID_FIT_EXTRA,
  };
}

function generateBox() {
  const { lidWidth, lidDepth } = syncLinkedDimensions();

  const allowance = parseInputValue(allowanceInput, 1);
  const bleedValue = parseInputValue(bleedInput, COLOR_SETTINGS.bleed);
  setNumericInputValue(bleedInput, bleedValue, COLOR_SETTINGS.bleed);
  const insideClearance = parseInputValue(insideClearanceInput, 4);
  setNumericInputValue(insideClearanceInput, insideClearance, 4);
  const W = parseInputValue(widthInput, 60);
  const H = parseInputValue(heightInput, 25);
  setNumericInputValue(heightInput, H, 25);
  const D = parseInputValue(depthInput, 46);
  const lidHeight = parseInputValue(lidHeightInput, 20);
  setNumericInputValue(lidHeightInput, lidHeight, 20);
  const showLabels = Boolean(showLabelsInput?.checked);
  const trapezoidFlaps = Boolean(trapezoidFlapsInput?.checked);
  const debugLabels = debugLabelsEnabled;
  const inkSave = Boolean(inkSaveInput?.checked);
  const appliedColor = resolveSelectedColor();
  const cutLineColor = cutLineColorInput?.value || "#000000";
  const foldLineColor = foldLineColorInput?.value || "#808080";
  const selectedPaper = paperSizeSelect ? paperSizeSelect.value : "A4";

  const boxSvgContent = createBoxSVG({
    width: W,
    height: H,
    depth: D,
    allowance,
    insideClearance,
    bleed: bleedValue,
    isLid: false,
    showLabels,
    debugLabels,
    color: appliedColor,
    inkSave,
    boxHeight: H,
    lidHeight,
    cutLineColor,
    foldLineColor,
    trapezoidFlaps,
    paperSize: selectedPaper,
  });
  svgContainerBox.innerHTML = boxSvgContent;
  const boxSvg = svgContainerBox.querySelector("svg");
  sizeSvgPreview(boxSvg);

  const lidSvgContent = createBoxSVG({
    width: lidWidth,
    height: lidHeight,
    depth: lidDepth,
    allowance,
    insideClearance,
    bleed: bleedValue,
    isLid: true,
    showLabels,
    debugLabels,
    color: appliedColor,
    inkSave: false,
    boxHeight: lidHeight,
    lidHeight,
    cutLineColor,
    foldLineColor,
    trapezoidFlaps,
    paperSize: selectedPaper,
  });
  svgContainerLid.innerHTML = lidSvgContent;
  const lidSvg = svgContainerLid.querySelector("svg");
  sizeSvgPreview(lidSvg);

  // Calculate dimensions (excluding margins)
  const margin = LAYOUT_CONSTANTS.margin * 2;
  const boxW =
    parseFloat(boxSvg.getAttribute("data-physical-width-mm") || "0") - margin;
  const boxH =
    parseFloat(boxSvg.getAttribute("data-physical-height-mm") || "0") - margin;
  const lidW =
    parseFloat(lidSvg.getAttribute("data-physical-width-mm") || "0") - margin;
  const lidH =
    parseFloat(lidSvg.getAttribute("data-physical-height-mm") || "0") - margin;

  // Paper Size Logic
  let boxFits = true;
  let lidFits = true;

  if (selectedPaper !== "None") {
    const paperSize = PAPER_SIZES[selectedPaper] || PAPER_SIZES.A4;
    const paperMin = Math.min(paperSize.width, paperSize.height);
    const paperMax = Math.max(paperSize.width, paperSize.height);

    const checkFit = (w, h) => {
      const min = Math.min(w, h);
      const max = Math.max(w, h);
      return min <= paperMin && max <= paperMax;
    };

    boxFits = checkFit(boxW, boxH);
    lidFits = checkFit(lidW, lidH);
  }

  // Update dimensions info
  const boxDimensionsEl = document.getElementById("box-dimensions");
  if (boxDimensionsEl) {
    boxDimensionsEl.textContent = `Dimensions: ${boxW.toFixed(
      1
    )} x ${boxH.toFixed(1)} mm`;
    if (!boxFits) {
      boxDimensionsEl.classList.add("exceeds-paper");
      boxDimensionsEl.textContent += ` (Exceeds ${selectedPaper})`;
    } else {
      boxDimensionsEl.classList.remove("exceeds-paper");
    }
  }

  const lidDimensionsEl = document.getElementById("lid-dimensions");
  if (lidDimensionsEl) {
    lidDimensionsEl.textContent = `Dimensions: ${lidW.toFixed(
      1
    )} x ${lidH.toFixed(1)} mm`;
    if (!lidFits) {
      lidDimensionsEl.classList.add("exceeds-paper");
      lidDimensionsEl.textContent += ` (Exceeds ${selectedPaper})`;
    } else {
      lidDimensionsEl.classList.remove("exceeds-paper");
    }
  }

  // Warning Logic
  const warningEl = document.getElementById("dimensions-warning");
  if (warningEl) {
    if (!boxFits || !lidFits) {
      warningEl.style.display = "block";
    } else {
      warningEl.style.display = "none";
    }
  }

  syncDimensionPresetSelection();
  syncColorPresetSelection();
}

function sizeSvgPreview(svgEl) {
  if (!svgEl) {
    return;
  }
  const widthMm = parseFloat(
    svgEl.getAttribute("data-physical-width-mm") || "0"
  );
  const heightMm = parseFloat(
    svgEl.getAttribute("data-physical-height-mm") || "0"
  );
  if (!(widthMm && heightMm)) {
    return;
  }
  const largestMm = Math.max(widthMm, heightMm);
  const scale = largestMm > MAX_PREVIEW_MM ? MAX_PREVIEW_MM / largestMm : 1;
  svgEl.style.width = `${widthMm * MM_TO_PX * scale}px`;
  svgEl.style.height = `${heightMm * MM_TO_PX * scale}px`;
}

const numericInputs = [
  widthInput,
  depthInput,
  heightInput,
  lidHeightInput,
  allowanceInput,
  bleedInput,
  insideClearanceInput,
];

numericInputs.forEach((input) => {
  input?.addEventListener("input", () => {
    if (
      dimensionPresetSelect &&
      (input === widthInput ||
        input === depthInput ||
        input === heightInput ||
        input === lidHeightInput)
    ) {
      dimensionPresetSelect.value = "";
    }
    scheduleGenerate();
  });
});

cutLineColorInput?.addEventListener("input", scheduleGenerate);
foldLineColorInput?.addEventListener("input", scheduleGenerate);

boxColorPicker?.addEventListener("input", () => {
  if (boxColorText) {
    boxColorText.value = boxColorPicker.value;
  }
  updateFoldLineColorInput(boxColorPicker.value);
  syncColorPresetSelection();
  scheduleGenerate();
});

paperSizeSelect?.addEventListener("change", () => {
  scheduleGenerate();
});

boxColorText?.addEventListener("input", () => {
  const { hex } = normalizeToHex(boxColorText.value);
  if (hex && boxColorPicker) {
    boxColorPicker.value = hex;
    updateFoldLineColorInput(hex);
  }
  syncColorPresetSelection();
  scheduleGenerate();
});

boxColorText?.addEventListener("blur", () => {
  const { hex } = normalizeToHex(boxColorText?.value);
  if (hex) {
    if (boxColorText) {
      boxColorText.value = hex;
    }
    if (boxColorPicker) {
      boxColorPicker.value = hex;
    }
  }
  syncColorPresetSelection();
});

dimensionPresetSelect?.addEventListener("change", () => {
  const option = dimensionPresetSelect.selectedOptions[0];
  if (option && option.dataset.width) {
    applyDimensionPreset(option);
  } else {
    scheduleGenerate();
  }
});

colorPresetSelect?.addEventListener("change", () => {
  const option = colorPresetSelect.selectedOptions[0];
  if (option) {
    if (option.value === "transparent") {
      if (foldLineColorInput) foldLineColorInput.value = "#808080";
      updateColorInputsState();
      scheduleGenerate();
    } else if (option.dataset.color) {
      applyColorPreset(option);
    } else {
      // Custom color
      updateColorInputsState();
      scheduleGenerate();
    }
  }
});

cutLineColorInput?.addEventListener("input", scheduleGenerate);
foldLineColorInput?.addEventListener("input", scheduleGenerate);

showLabelsInput?.addEventListener("change", scheduleGenerate);
trapezoidFlapsInput?.addEventListener("change", scheduleGenerate);

inkSaveInput?.addEventListener("change", scheduleGenerate);

// Preset chip interactions
function initPresetChips() {
  const dimensionChips = document.querySelectorAll(
    "#dimensionChips .preset-chip"
  );
  const colorChips = document.querySelectorAll("#colorChips .preset-chip");

  // Sync chip active states with dropdown selections
  function syncChipStates() {
    dimensionChips.forEach((chip) => {
      const presetValue = chip.dataset.preset;
      chip.classList.toggle(
        "active",
        dimensionPresetSelect?.value === presetValue
      );
    });

    colorChips.forEach((chip) => {
      const presetValue = chip.dataset.preset;
      chip.classList.toggle("active", colorPresetSelect?.value === presetValue);
    });
  }

  // Expose globally for sync functions
  window.syncPresetChipStates = syncChipStates;

  // Handle dimension chip clicks
  dimensionChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const presetValue = chip.dataset.preset;
      if (dimensionPresetSelect) {
        dimensionPresetSelect.value = presetValue;
        dimensionPresetSelect.dispatchEvent(new Event("change"));
      }
      syncChipStates();
    });
  });

  // Handle color chip clicks
  colorChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const presetValue = chip.dataset.preset;
      if (colorPresetSelect) {
        colorPresetSelect.value = presetValue;
        colorPresetSelect.dispatchEvent(new Event("change"));
      }
      syncChipStates();
    });
  });

  // Sync on dropdown changes
  dimensionPresetSelect?.addEventListener("change", syncChipStates);
  colorPresetSelect?.addEventListener("change", syncChipStates);

  // Initial sync
  syncChipStates();
}

async function loadPresets() {
  let data = null;

  if (typeof fetch === "function") {
    try {
      const response = await fetch("presets.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      data = await response.json();
    } catch (error) {
      console.error("Error fetching presets.json:", error);
    }
  }

  if (!data) {
    try {
      const presetScript = document.getElementById("presets-data");
      if (presetScript?.textContent) {
        data = JSON.parse(presetScript.textContent);
      }
    } catch (error) {
      console.error("Error parsing inline presets:", error);
    }
  }

  DIMENSION_PRESETS = data?.dimensions || [];
  COLOR_PRESETS = data?.colors || [];
}

async function loadFooterLogo() {
  if (typeof fetch !== "function") {
    return;
  }

  try {
    const response = await fetch(FOOTER_LOGO_PATH, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const svgText = await response.text();
    const svgMatch = svgText.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/i);
    if (!svgMatch) {
      footerLogoMarkup = svgText.trim();
      return;
    }

    footerLogoMarkup = svgMatch[1].trim() || "";

    const svgTag = svgMatch[0];
    const viewBoxMatch = svgTag.match(/viewBox=["']([^"']+)["']/i);
    if (viewBoxMatch) {
      const viewBoxParts = viewBoxMatch[1]
        .trim()
        .split(/[\s,]+/)
        .map((value) => Number(value));
      if (
        viewBoxParts.length === 4 &&
        Number.isFinite(viewBoxParts[2]) &&
        Number.isFinite(viewBoxParts[3]) &&
        viewBoxParts[2] > 0 &&
        viewBoxParts[3] > 0
      ) {
        footerLogoWidth = viewBoxParts[2];
        footerLogoHeight = viewBoxParts[3];
        return;
      }
    }

    const widthMatch = svgTag.match(/width=["']([\d.]+)["']/i);
    const heightMatch = svgTag.match(/height=["']([\d.]+)["']/i);
    const parsedWidth = widthMatch ? Number(widthMatch[1]) : null;
    const parsedHeight = heightMatch ? Number(heightMatch[1]) : null;
    if (
      Number.isFinite(parsedWidth) &&
      Number.isFinite(parsedHeight) &&
      parsedWidth > 0 &&
      parsedHeight > 0
    ) {
      footerLogoWidth = parsedWidth;
      footerLogoHeight = parsedHeight;
    }
  } catch (error) {
    console.error("Error loading footer logo:", error);
  }
}

function populatePresetDropdowns() {
  // Populate dimension presets
  if (dimensionPresetSelect) {
    dimensionPresetSelect.innerHTML =
      '<option value="">Custom dimensions</option>';
    DIMENSION_PRESETS.forEach((item) => {
      if (item.presets && Array.isArray(item.presets)) {
        const optgroup = document.createElement("optgroup");
        optgroup.label = item.category || item.name || "Group";
        item.presets.forEach((preset) => {
          const option = document.createElement("option");
          option.value = preset.id;
          option.textContent = preset.name;
          option.dataset.width = preset.width;
          option.dataset.depth = preset.depth;
          option.dataset.height = preset.height;
          option.dataset.lidHeight = preset.lidHeight;
          optgroup.appendChild(option);
        });
        dimensionPresetSelect.appendChild(optgroup);
      }
    });
  }

  // Populate color presets
  if (colorPresetSelect) {
    colorPresetSelect.innerHTML =
      '<option value="transparent">Transparent</option><option value="">Custom color</option>';
    COLOR_PRESETS.forEach((item) => {
      if (item.presets && Array.isArray(item.presets)) {
        const optgroup = document.createElement("optgroup");
        optgroup.label = item.category || item.name || "Group";
        item.presets.forEach((preset) => {
          const option = document.createElement("option");
          option.value = preset.id;
          option.textContent = preset.name;
          option.dataset.color = preset.color;
          optgroup.appendChild(option);
        });
        colorPresetSelect.appendChild(optgroup);
      }
    });
  }
}

function initAdvancedToggle() {
  const advancedSection = document.querySelector(".advanced-section");
  const toggleButton = document.querySelector(".advanced-toggle");
  const advancedContent = document.getElementById("advancedFields");

  if (!advancedSection || !toggleButton || !advancedContent) {
    return;
  }

  const setState = (expanded) => {
    toggleButton.setAttribute("aria-expanded", expanded ? "true" : "false");
    advancedSection.classList.toggle("is-collapsed", !expanded);
    toggleButton.textContent = expanded ? "Hide" : "Show";
  };

  toggleButton.addEventListener("click", () => {
    const expanded = toggleButton.getAttribute("aria-expanded") === "true";
    setState(!expanded);
  });

  setState(false);
}

function initDonateAvatarSwap() {
  const donateButton = document.querySelector(".donate-button");
  const donateAvatar = document.querySelector(".donate-avatar");

  if (!donateButton || !donateAvatar) {
    return;
  }

  const heartSrc = "me_hearts.png";

  donateButton.addEventListener("click", () => {
    if (donateAvatar.getAttribute("src") !== heartSrc) {
      donateAvatar.setAttribute("src", heartSrc);
    }
  });
}

const STORAGE_KEY = "ultimate_paper_boxes_settings";

function saveSettings() {
  const settings = {
    width: widthInput?.value,
    depth: depthInput?.value,
    height: heightInput?.value,
    lidHeight: lidHeightInput?.value,
    allowance: allowanceInput?.value,
    bleed: bleedInput?.value,
    insideClearance: insideClearanceInput?.value,
    trapezoidFlaps: trapezoidFlapsInput?.checked,
    cutLineColor: cutLineColorInput?.value,
    foldLineColor: foldLineColorInput?.value,
    boxColor: boxColorPicker?.value,
    showLabels: showLabelsInput?.checked,
    inkSave: inkSaveInput?.checked,
    paperSize: paperSizeSelect?.value,
    dimensionPreset: dimensionPresetSelect?.value,
    colorPreset: colorPresetSelect?.value,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function loadSettings() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const settings = JSON.parse(saved);

    if (settings.width && widthInput) widthInput.value = settings.width;
    if (settings.depth && depthInput) depthInput.value = settings.depth;
    if (settings.height && heightInput) heightInput.value = settings.height;
    if (settings.lidHeight && lidHeightInput)
      lidHeightInput.value = settings.lidHeight;
    if (settings.allowance && allowanceInput)
      allowanceInput.value = settings.allowance;
    if (settings.bleed && bleedInput) bleedInput.value = settings.bleed;
    if (settings.insideClearance && insideClearanceInput)
      insideClearanceInput.value = settings.insideClearance;

    if (settings.trapezoidFlaps !== undefined && trapezoidFlapsInput)
      trapezoidFlapsInput.checked = settings.trapezoidFlaps;
    if (settings.cutLineColor && cutLineColorInput)
      cutLineColorInput.value = settings.cutLineColor;
    if (settings.foldLineColor && foldLineColorInput)
      foldLineColorInput.value = settings.foldLineColor;

    if (settings.boxColor) {
      if (boxColorPicker) boxColorPicker.value = settings.boxColor;
      if (boxColorText) boxColorText.value = settings.boxColor;
    }

    if (settings.showLabels !== undefined && showLabelsInput)
      showLabelsInput.checked = settings.showLabels;
    if (settings.inkSave !== undefined && inkSaveInput)
      inkSaveInput.checked = settings.inkSave;
    if (settings.paperSize && paperSizeSelect)
      paperSizeSelect.value = settings.paperSize;

    if (settings.dimensionPreset && dimensionPresetSelect) {
      if (
        [...dimensionPresetSelect.options].some(
          (o) => o.value === settings.dimensionPreset
        )
      ) {
        dimensionPresetSelect.value = settings.dimensionPreset;
      }
    }
    if (settings.colorPreset && colorPresetSelect) {
      if (
        [...colorPresetSelect.options].some(
          (o) => o.value === settings.colorPreset
        )
      ) {
        colorPresetSelect.value = settings.colorPreset;
      }
    }

    // Update UI state based on loaded values
    updateColorInputsState();
  } catch (e) {
    console.error("Failed to load settings", e);
  }
}

window.addEventListener("load", async () => {
  await Promise.all([loadPresets(), loadFooterLogo()]);
  populatePresetDropdowns();

  // Load settings after presets are populated
  loadSettings();

  if (colorPresetSelect && !localStorage.getItem(STORAGE_KEY)) {
    colorPresetSelect.value = "transparent";
  }

  syncLinkedDimensions();
  updateColorInputsState();
  if (boxColorPicker && boxColorText && !boxColorText.value) {
    boxColorText.value = boxColorPicker.value;
  }
  initPresetChips();
  initAdvancedToggle();
  initDonateAvatarSwap();
  generateBox();
});

// Instructions Logic
function toggleInstructions(targetId) {
  const appView = document.getElementById("app-view");
  const instructionsView = document.getElementById("instructions-view");

  if (instructionsView.classList.contains("active")) {
    // Switch to App
    instructionsView.classList.remove("active");
    setTimeout(() => {
      instructionsView.style.display = "none";
      appView.classList.remove("hidden");
      window.scrollTo(0, 0);
    }, 150);
  } else {
    // Switch to Instructions
    appView.classList.add("hidden");
    instructionsView.style.display = "block";
    // Force reflow
    void instructionsView.offsetWidth;
    instructionsView.classList.add("active");
    window.scrollTo(0, 0);

    // Initialize if empty
    const stepsContainer = document.getElementById("stepsGrid");
    if (stepsContainer && stepsContainer.children.length === 0) {
      initInstructions();
    }

    if (targetId) {
      setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 200);
    }
  }
}

function initInstructions() {
  const stepsContainer = document.getElementById("stepsGrid");
  if (!stepsContainer) return;

  const totalImages = 23;
  const instructionSteps = totalImages - 1;

  const sections = [
    { startStep: 1, title: "Cutting" },
    { startStep: 3, title: "Scoring" },
    { startStep: 7, title: "Folding the box" },
    { startStep: 12, title: "Folding the lid" },
    { startStep: 16, title: "Assembling" },
    { startStep: 18, title: "Layout too large" },
  ];

  const stepDescriptions = {
    1: "Print your designs on cardstock paper.",
    2: "Cut along the solid black outer lines.",
    3: "Align the dashed fold lines with your scoring tool.",
    4: "Score all dashed lines to ensure clean, sharp folds.",
    5: "Verify that every line has been scored.",
    6: "Double-check all scores before proceeding.",
    7: "Pre-fold along all scored lines to establish the shape.",
    8: "Fold up the left side and tuck in the corner flaps.",
    9: "Fold up the right side, ensuring all flaps are tucked inside the walls.",
    10: "Fold the short back flap over and lock it into place.",
    11: "Fold the long front flap over to cover the interior bottom.",
    12: "Repeat for the lid: Fold up the left side and tuck in flaps.",
    13: "Fold up the right side and tuck flaps inside the lid walls.",
    14: "Fold the short back flap over and lock it.",
    15: "Fold the long front flap over to finish the lid interior.",
    16: "Your box and lid are now fully assembled.",
    17: "Slide the lid onto the box to complete the package.",
    18: "Notice that the layout edges are cropped when printing.",
    19: "Extend any cut lines that were truncated by the printer.",
    20: "Be aware that shortened flaps may not tuck securely.",
    21: "Apply tape to secure any loose flaps or sides.",
    22: "The larger box is now complete.",
  };

  // Render Steps 1 to 22
  for (let i = 1; i <= 22; i++) {
    // Check if we need to insert a section header
    const section = sections.find((s) => s.startStep === i);
    if (section) {
      const header = document.createElement("div");
      header.className = "section-header";
      header.innerHTML = `<h2>${section.title}</h2>`;
      stepsContainer.appendChild(header);
    }

    // Image index is step number + 1 (since step 1 is tools)
    let imagePath;
    if (i >= 18 && i <= 22) {
      const croppedIndex = String(i - 17).padStart(2, "0");
      imagePath = `assets/cropped_${croppedIndex}.jpg`;
    } else {
      const imageIndex = i + 1;
      const paddedIndex = String(imageIndex).padStart(2, "0");
      imagePath = `assets/step_${paddedIndex}.jpg`;
    }

    let defaultDesc = `Description for step ${i}. This explains what to do in this part of the assembly process.`;
    if (i >= 16 && i < 18) defaultDesc = "Assemble the box and lid together.";

    const description = stepDescriptions[i] || defaultDesc;

    // For steps 18-22, restart numbering from 1
    const displayNumber = i >= 18 && i <= 22 ? i - 17 : i;

    const stepCard = document.createElement("div");
    stepCard.className = "step-card";
    stepCard.id = `step-${i}`;
    stepCard.innerHTML = `
      <div class="step-image-container">
        <img src="${imagePath}" alt="Step ${i}" loading="lazy" />
      </div>
      <div class="step-content">
        <div class="step-number">${displayNumber}</div>
        <p class="step-description">${description}</p>
      </div>
    `;
    stepsContainer.appendChild(stepCard);
  }

  // Render Gallery Section (Remaining step images)
  const galleryHeader = document.createElement("div");
  galleryHeader.className = "section-header";
  galleryHeader.innerHTML = `<h2>Gallery</h2>`;
  stepsContainer.appendChild(galleryHeader);

  // Images step_19.jpg to step_23.jpg (totalImages)
  for (let imgIdx = 19; imgIdx <= totalImages; imgIdx++) {
    const paddedIndex = String(imgIdx).padStart(2, "0");
    const imagePath = `assets/step_${paddedIndex}.jpg`;

    const galleryCard = document.createElement("div");
    galleryCard.className = "step-card";
    galleryCard.innerHTML = `
      <div class="step-image-container">
        <img src="${imagePath}" alt="Gallery Image" loading="lazy" />
      </div>
    `;
    stepsContainer.appendChild(galleryCard);
  }
}
