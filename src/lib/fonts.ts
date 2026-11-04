import localFont from "next/font/local";

// Self-hosted (Latin subset, variable weights). No network access needed at build time.
export const federo = localFont({ src: "../fonts/federo-latin.woff2", weight: "400", variable: "--font-federo", display: "swap", fallback: ["Trebuchet MS", "sans-serif"] });
export const inter = localFont({ src: "../fonts/inter-latin.woff2", weight: "100 900", variable: "--font-inter", display: "swap", fallback: ["Arial", "sans-serif"] });

// The SphereWars wordmark is set in Abaddon (owner's brand font); every other title uses Federo.
export const abaddon = localFont({ src: "../fonts/abaddon.ttf", variable: "--font-abaddon", display: "swap", fallback: ["Times New Roman", "serif"] });
