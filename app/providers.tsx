"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem enableColorScheme>
      {children}
      <Toaster
        className="sonner-puff"
        position="top-center"
        theme="system"
        richColors
        closeButton
        gap={10}
        offset={{ top: "max(1rem, env(safe-area-inset-top))" }}
        mobileOffset={{ top: "max(0.75rem, env(safe-area-inset-top))", left: 12, right: 12 }}
        toastOptions={{ duration: 3200 }}
      />
    </ThemeProvider>
  );
}
