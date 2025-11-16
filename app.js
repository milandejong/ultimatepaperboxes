const MM_TO_PX = 3;
const DECIMAL_PRECISION = 1;
const DECIMAL_FACTOR = 10 ** DECIMAL_PRECISION;

const LAYOUT_CONSTANTS = {
  margin: 20,
  panelGHeight: 10,
  sideFlapWidth: 10,
};

const STYLES = {
  cut: "stroke:#000000; stroke-width:0.35; fill:none;",
  fold: {
    mountain: "stroke:#d1d5db; stroke-width:0.25; fill:none;",
    valley:
      "stroke:#d1d5db; stroke-width:0.25; stroke-dasharray: 1 4; fill:none;",
  },
  text: {
    primary:
      "fill:#111827; font-size: 4px; font-family: sans-serif; text-anchor: middle; alignment-baseline: middle;",
    muted:
      "fill:rgba(17, 24, 39, 0.6); font-size: 4px; font-family: sans-serif; text-anchor: middle; alignment-baseline: middle;",
  },
};

const COLOR_SETTINGS = {
  bleed: 10,
  panelOpacity: 1,
  flapOpacity: 1,
};

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

function getStyleConfig({ color }) {
  const base = {
    cut: STYLES.cut,
    fold: { ...STYLES.fold },
    text: { ...STYLES.text },
  };

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

  if (accentColor) {
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

function computeLayout(W, H, D, allowance) {
  const { margin, panelGHeight, sideFlapWidth } = LAYOUT_CONSTANTS;

  const y0 = margin;
  const y1 = y0 + (D - (allowance - 1));
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

  return lines
    .map(({ x1, y1, x2, y2, style, accent }) => {
      const appliedStyle =
        accent && styles.fold?.accent ? styles.fold.accent : style;
      return createLineElement(x1, y1, x2, y2, appliedStyle);
    })
    .join("\n");
}

function buildCutPath(layout, styles = STYLES) {
  const { x, y, flaps } = layout;
  const commands = [
    `M ${x.x3},${y.y0}`,
    `L ${x.x4},${y.y0}`,
    `L ${x.x4},${y.y1}`,
    `L ${x.x4},${y.y2}`,
    `L ${x.x4},${y.y3}`,
    `L ${flaps.p1.left},${y.y3}`,
    `L ${flaps.p1.left},${flaps.p1.top}`,
    `L ${flaps.p1.right},${flaps.p1.top}`,
    `L ${flaps.p1.right},${y.y3}`,
    `L ${x.x5},${y.y3}`,
    `L ${x.x7},${y.y3}`,
    `L ${x.x7},${y.y4}`,
    `L ${x.x5},${y.y4}`,
    `L ${x.x4},${y.y4}`,
    `L ${x.x4},${flaps.p4.top}`,
    `L ${flaps.p4.right},${flaps.p4.top}`,
    `L ${flaps.p4.right},${flaps.p4.bottom}`,
    `L ${x.x4},${flaps.p4.bottom}`,
    `L ${x.x4},${y.y5}`,
    `L ${x.x4},${y.y7}`,
    `L ${x.x3},${y.y7}`,
    `L ${x.x3},${y.y5}`,
    `L ${x.x3},${y.y4}`,
    `L ${flaps.p2.right},${y.y4}`,
    `L ${flaps.p2.right},${flaps.p2.bottom}`,
    `L ${flaps.p2.left},${flaps.p2.bottom}`,
    `L ${flaps.p2.left},${y.y4}`,
    `L ${x.x2},${y.y4}`,
    `L ${x.x0},${y.y4}`,
    `L ${x.x0},${y.y3}`,
    `L ${x.x2},${y.y3}`,
    `L ${x.x3},${y.y3}`,
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
      const visibleHeight = boxHeight - lidHeight + allowance;

      if (id === "left") {
        const colorWidth = Math.min(visibleHeight, width);
        if (colorWidth > 0 && height > 0) {
          const colorX = px + width - colorWidth;
          rects.push(
            createRectElement(colorX, py, colorWidth, height, panelStyle)
          );
        }
      } else if (id === "right") {
        const colorWidth = Math.min(visibleHeight, width);
        if (colorWidth > 0 && height > 0) {
          rects.push(createRectElement(px, py, colorWidth, height, panelStyle));
        }
      } else if (id === "top") {
        const colorHeight = Math.min(visibleHeight, height);
        if (width > 0 && colorHeight > 0) {
          const colorY = py + height - colorHeight;
          rects.push(
            createRectElement(px, colorY, width, colorHeight, panelStyle)
          );
        }
      } else if (id === "bottom") {
        const colorHeight = Math.min(visibleHeight, height);
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

  const bleedDistance = Math.max(0, bleed);

  if (flaps?.p1) {
    const flapWidth = flaps.p1.right - flaps.p1.left;
    const flapHeight = flaps.p1.bottom - flaps.p1.top;
    let stripHeight = Math.min(bleedDistance, flapHeight);
    let stripWidth = flapWidth;
    let stripX = flaps.p1.left;

    if (!isLid && inkSave) {
      const visibleHeight = boxHeight - lidHeight + allowance;
      stripWidth = Math.min(visibleHeight, flapWidth);
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
      const visibleHeight = boxHeight - lidHeight + allowance;
      stripWidth = Math.min(visibleHeight, flapWidth);
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
      const visibleHeight = boxHeight - lidHeight + allowance;
      stripHeight = Math.min(visibleHeight, flapHeight);
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
      const visibleHeight = boxHeight - lidHeight + allowance;
      stripHeight = Math.min(visibleHeight, flapHeight);
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
    rotation: 180,
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

function createBoxSVG({
  width,
  height,
  depth,
  allowance,
  isLid = false,
  showLabels = false,
  debugLabels = false,
  color = null,
  inkSave = false,
  boxHeight = 0,
  lidHeight = 0,
}) {
  const layout = computeLayout(width, height, depth, allowance);
  const styles = getStyleConfig({ isLid, color });
  const foldLinesMarkup = buildFoldLines(layout, styles);
  const cutPathMarkup = buildCutPath(layout, styles);
  const layoutPathsMarkup = [foldLinesMarkup, cutPathMarkup]
    .filter(Boolean)
    .join("\n");
  const labelMarkup = showLabels
    ? buildLabels(layout, isLid, styles, { debugLabels })
    : "";
  const colorPanels = color
    ? buildColorPanels(layout, color, {
        bleed: COLOR_SETTINGS.bleed,
        isLid,
        inkSave,
        boxHeight,
        lidHeight,
        allowance,
      })
    : "";
  const widthMm = layout.viewBox.width;
  const heightMm = layout.viewBox.height;

  return `
          <svg 
              version="1.1"
              width="${widthMm}mm"
              height="${heightMm}mm"
              viewBox="${layout.viewBox.x} ${layout.viewBox.y} ${
    layout.viewBox.width
  } ${layout.viewBox.height}" 
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
              <g id="layout-paths">
                  ${layoutPathsMarkup}
              </g>
              <g id="labels">
                  ${labelMarkup}
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

const widthInput = document.getElementById("width");
const depthInput = document.getElementById("depth");
const heightInput = document.getElementById("height");
const lidHeightInput = document.getElementById("lidHeight");
const allowanceInput = document.getElementById("allowance");
const boxColorPicker = document.getElementById("boxColorPicker");
const boxColorText = document.getElementById("boxColorText");
const useColorCheckbox = document.getElementById("useColor");
const showLabelsInput = document.getElementById("showLabels");
const inkSaveInput = document.getElementById("inkSave");
const svgContainerBox = document.getElementById("svg-container-box");
const svgContainerLid = document.getElementById("svg-container-lid");
const MAX_PREVIEW_MM = 100;

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

function setColorInputsEnabled(enabled) {
  const shouldDisable = !enabled;
  if (boxColorPicker) {
    boxColorPicker.disabled = shouldDisable;
  }
  if (boxColorText) {
    boxColorText.disabled = shouldDisable;
  }
}

function updateInkSaveAvailability() {
  if (!inkSaveInput) {
    return;
  }
  const disableInkSave = useColorCheckbox ? !useColorCheckbox.checked : false;
  inkSaveInput.disabled = disableInkSave;
  if (disableInkSave) {
    inkSaveInput.checked = false;
  }
}

function resolveSelectedColor() {
  if (!useColorCheckbox?.checked) {
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

function syncLinkedDimensions() {
  const allowance = parseInputValue(allowanceInput, 3);
  setNumericInputValue(allowanceInput, allowance, 3);
  const baseWidth = parseInputValue(widthInput, 61);
  setNumericInputValue(widthInput, baseWidth, 61);

  const baseDepth = parseInputValue(depthInput, 46);
  setNumericInputValue(depthInput, baseDepth, 46);

  return {
    lidWidth: baseWidth + allowance,
    lidDepth: baseDepth + allowance,
  };
}

function generateBox() {
  const { lidWidth, lidDepth } = syncLinkedDimensions();

  const allowance = parseInputValue(allowanceInput, 3);
  const W = parseInputValue(widthInput, 61);
  const H = parseInputValue(heightInput, 25);
  setNumericInputValue(heightInput, H, 25);
  const D = parseInputValue(depthInput, 46);
  const lidHeight = parseInputValue(lidHeightInput, 20);
  setNumericInputValue(lidHeightInput, lidHeight, 20);
  const showLabels = Boolean(showLabelsInput?.checked);
  const debugLabels = debugLabelsEnabled;
  const inkSave = Boolean(inkSaveInput?.checked);
  const appliedColor = resolveSelectedColor();

  const boxSvgContent = createBoxSVG({
    width: W,
    height: H,
    depth: D,
    allowance,
    isLid: false,
    showLabels,
    debugLabels,
    color: appliedColor,
    inkSave,
    boxHeight: H,
    lidHeight,
  });
  svgContainerBox.innerHTML = boxSvgContent;
  const boxSvg = svgContainerBox.querySelector("svg");
  sizeSvgPreview(boxSvg);

  const lidSvgContent = createBoxSVG({
    width: lidWidth,
    height: lidHeight,
    depth: lidDepth,
    allowance,
    isLid: true,
    showLabels,
    debugLabels,
    color: appliedColor,
    inkSave: false,
    boxHeight: lidHeight,
    lidHeight,
  });
  svgContainerLid.innerHTML = lidSvgContent;
  const lidSvg = svgContainerLid.querySelector("svg");
  sizeSvgPreview(lidSvg);
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
];

numericInputs.forEach((input) => {
  input?.addEventListener("input", scheduleGenerate);
});

useColorCheckbox?.addEventListener("change", () => {
  const enableCustom = Boolean(useColorCheckbox.checked);
  setColorInputsEnabled(enableCustom);
  updateInkSaveAvailability();
  scheduleGenerate();
});

boxColorPicker?.addEventListener("input", () => {
  if (boxColorText) {
    boxColorText.value = boxColorPicker.value;
  }
  scheduleGenerate();
});

boxColorText?.addEventListener("input", () => {
  const { hex } = normalizeToHex(boxColorText.value);
  if (hex && boxColorPicker) {
    boxColorPicker.value = hex;
  }
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
});

showLabelsInput?.addEventListener("change", scheduleGenerate);

inkSaveInput?.addEventListener("change", scheduleGenerate);

window.addEventListener("load", () => {
  syncLinkedDimensions();
  setColorInputsEnabled(Boolean(useColorCheckbox?.checked));
  updateInkSaveAvailability();
  if (boxColorPicker && boxColorText && !boxColorText.value) {
    boxColorText.value = boxColorPicker.value;
  }
  generateBox();
});
