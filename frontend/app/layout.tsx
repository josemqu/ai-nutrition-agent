import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NutriAgent DM1 – Asistente Nutricional para Diabetes Tipo 1",
  description:
    "Analiza recetas, fotos de platillos y alimentos para calcular carbohidratos, índice glucémico y dosis de insulina para personas con Diabetes Mellitus Tipo 1.",
  keywords: ["diabetes tipo 1", "insulina", "nutrición", "carbohidratos", "índice glucémico", "IA"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
