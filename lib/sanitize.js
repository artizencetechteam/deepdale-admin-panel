"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeLimitedHtml = sanitizeLimitedHtml;
exports.sanitizeRequiredLimitedHtml = sanitizeRequiredLimitedHtml;
exports.sanitizeSvgMarkup = sanitizeSvgMarkup;
exports.sanitizeRequiredSvgMarkup = sanitizeRequiredSvgMarkup;
const sanitize_html_1 = __importDefault(require("sanitize-html"));
const errors_1 = require("./errors");
function sanitizeLimitedHtml(value) {
    return (0, sanitize_html_1.default)(value, {
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
function sanitizeRequiredLimitedHtml(value) {
    const sanitized = sanitizeLimitedHtml(value).trim();
    const textContent = (0, sanitize_html_1.default)(sanitized, {
        allowedTags: [],
        allowedAttributes: {}
    }).trim();
    if (!sanitized || !textContent) {
        throw new errors_1.AppError(400, "invalid_html_markup", "HTML markup did not contain any safe text content");
    }
    return sanitized;
}
function sanitizeSvgMarkup(value) {
    return (0, sanitize_html_1.default)(value, {
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
function sanitizeRequiredSvgMarkup(value) {
    const sanitized = sanitizeSvgMarkup(value);
    if (!sanitized || !sanitized.includes("<svg")) {
        throw new errors_1.AppError(400, "invalid_svg_markup", "SVG markup did not contain a safe root <svg> element");
    }
    return sanitized;
}
