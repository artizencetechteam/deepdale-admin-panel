import sanitizeHtml from "sanitize-html";

import { AppError } from "./errors";

export function sanitizeLimitedHtml(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: [
      "a",
      "b",
      "br",
      "em",
      "i",
      "p",
      "span",
      "strong",
      "ul",
      "ol",
      "li"
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      span: ["class"]
    },
    allowedSchemes: ["http", "https", "mailto"]
  });
}

export function sanitizeRequiredLimitedHtml(value: string): string {
  const sanitized = sanitizeLimitedHtml(value).trim();
  const textContent = sanitizeHtml(sanitized, {
    allowedTags: [],
    allowedAttributes: {}
  }).trim();

  if (!sanitized || !textContent) {
    throw new AppError(
      400,
      "invalid_html_markup",
      "HTML markup did not contain any safe text content"
    );
  }

  return sanitized;
}

export function sanitizeSvgMarkup(value: string): string {
  return sanitizeHtml(value, {
    parser: {
      lowerCaseTags: false
    },
    allowedTags: [
      "svg",
      "g",
      "path",
      "circle",
      "rect",
      "ellipse",
      "polygon",
      "polyline",
      "line",
      "defs",
      "linearGradient",
      "radialGradient",
      "stop",
      "clipPath",
      "mask",
      "title",
      "desc"
    ],
    allowedAttributes: {
      "*": [
        "fill",
        "stroke",
        "stroke-width",
        "stroke-linecap",
        "stroke-linejoin",
        "stroke-miterlimit",
        "stroke-dasharray",
        "stroke-dashoffset",
        "opacity",
        "d",
        "cx",
        "cy",
        "r",
        "rx",
        "ry",
        "x",
        "y",
        "x1",
        "x2",
        "y1",
        "y2",
        "width",
        "height",
        "viewBox",
        "xmlns",
        "id",
        "class",
        "transform",
        "points",
        "offset",
        "stop-color",
        "stop-opacity",
        "clip-path",
        "mask",
        "preserveAspectRatio"
      ]
    },
    allowedSchemes: [],
    allowedSchemesAppliedToAttributes: []
  }).trim();
}

export function sanitizeRequiredSvgMarkup(value: string): string {
  const sanitized = sanitizeSvgMarkup(value);

  if (!sanitized || !sanitized.includes("<svg")) {
    throw new AppError(
      400,
      "invalid_svg_markup",
      "SVG markup did not contain a safe root <svg> element"
    );
  }

  return sanitized;
}
