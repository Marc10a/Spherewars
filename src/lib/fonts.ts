import localFont from "next/font/local";

// Self-hosted (Latin subset, variable weights). No network access needed at build time.
export const cinzel = localFont({ src: "../fonts/cinzel-latin.woff2", weight: "400 900", variable: "--font-cinzel", display: "swap", fallback: ["Times New Roman", "serif"] });
export const inter = localFont({ src: "../fonts/inter-latin.woff2", weight: "100 900", variable: "--font-inter", display: "swap", fallback: ["Arial", "sans-serif"] });

// The SphereWars wordmark is set in Abaddon (owner's brand font); every other title uses Cinzel.
export const abaddon = localFont({ src: "../fonts/abaddon.ttf", variable: "--font-abaddon", display: "swap", fallback: ["Times New Roman", "serif"] });
