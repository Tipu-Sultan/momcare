import type { Metadata } from "next";
import "./globals.css";

// 👇 Is metadata object ko update kiya hai
export const metadata: Metadata = {
  title: "MomCare — Health Dashboard",
  description: "Lovingly track Mom's health: Sugar, BP & Thyroid",
  manifest: "/manifest.json", // 👈 Manifest file ka path
  appleWebApp: {
    capable: true,
    title: "MomCare",
    statusBarStyle: "default",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Anti-crash patch for sandboxed environments where window.fetch has only a getter */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var target = window;
                  var desc = Object.getOwnPropertyDescriptor(target, "fetch");
                  if (!desc) {
                    target = Object.getPrototypeOf(window);
                    desc = Object.getOwnPropertyDescriptor(target, "fetch");
                  }
                  if (desc && desc.configurable) {
                    var currentFetch = window.fetch;
                    Object.defineProperty(window, "fetch", {
                      configurable: true,
                      enumerable: true,
                      get: function() { return currentFetch; },
                      set: function(val) { currentFetch = val; }
                    });
                  }
                } catch (e) {
                  console.warn("window.fetch patch error:", e);
                }
              })();
            `
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        
        {/* iOS ke liye theme color meta */}
        <meta name="theme-color" content="#e8566a" />
      </head>
      <body>{children}</body>
    </html>
  );
}