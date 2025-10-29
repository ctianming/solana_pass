export default function viewport() {
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover" as const,
    themeColor: [{ media: "(prefers-color-scheme: light)", color: "#fafafa" }, { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" }],
  };
}
