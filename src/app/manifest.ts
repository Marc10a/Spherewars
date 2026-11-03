import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SphereWars: Otro Mundo",
    short_name: "SphereWars",
    description: "Escaramuzas frenéticas en otro mundo.",
    start_url: "/es",
    display: "standalone",
    background_color: "#080a0d",
    theme_color: "#080a0d",
    icons: [{ src: "/brand/logo.jpeg", sizes: "150x150", type: "image/jpeg" }],
  };
}
