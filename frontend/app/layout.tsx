import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ThermoMonitor",
    template: "%s | ThermoMonitor",
  },
  description: "Monitoramento térmico inteligente para operações industriais.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Toaster
          position="top-right"
          closeButton
          richColors
          toastOptions={{
            classNames: {
              toast: "font-sans",
            },
          }}
        />
      </body>
    </html>
  );
}
