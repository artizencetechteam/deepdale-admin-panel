"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GRADIENT_PRESET_TOKENS = exports.GRADIENT_PRESETS = void 0;
exports.GRADIENT_PRESETS = [
    {
        token: "ocean-blue",
        label: "Ocean Blue",
        preview: "linear-gradient(135deg, #0047ff 0%, #00c2ff 100%)"
    },
    {
        token: "sunset-orange",
        label: "Sunset Orange",
        preview: "linear-gradient(135deg, #ff6b00 0%, #ffb547 100%)"
    },
    {
        token: "emerald-glow",
        label: "Emerald Glow",
        preview: "linear-gradient(135deg, #0f9d58 0%, #8de969 100%)"
    },
    {
        token: "deep-ink",
        label: "Deep Ink",
        preview: "linear-gradient(135deg, #101828 0%, #344054 100%)"
    },
    {
        token: "berry-punch",
        label: "Berry Punch",
        preview: "linear-gradient(135deg, #d92d20 0%, #f97066 100%)"
    },
    {
        token: "royal-violet",
        label: "Royal Violet",
        preview: "linear-gradient(135deg, #6941c6 0%, #9e77ed 100%)"
    },
    {
        token: "gold-lift",
        label: "Gold Lift",
        preview: "linear-gradient(135deg, #b54708 0%, #f79009 100%)"
    },
    {
        token: "teal-circuit",
        label: "Teal Circuit",
        preview: "linear-gradient(135deg, #087a72 0%, #1dcfd1 100%)"
    }
];
exports.GRADIENT_PRESET_TOKENS = new Set(exports.GRADIENT_PRESETS.map((preset) => preset.token));
