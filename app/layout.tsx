import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claudia",
  description: "Talk to Claudia",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Belt and braces alongside useAppHeight(): on browsers that honour it, the
  // layout viewport itself shrinks for the keyboard. Where it is ignored
  // (most iOS Safari versions) the visualViewport listener still handles it.
  interactiveWidget: "resizes-content",
  // Pinch-zoom stays available; only the auto-zoom-on-focus is avoided, via
  // the 16px input font size. Never set maximumScale/userScalable here — that
  // breaks zoom for low-vision users.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
