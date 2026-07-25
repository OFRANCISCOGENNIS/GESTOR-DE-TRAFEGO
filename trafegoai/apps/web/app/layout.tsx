import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });

export const metadata: Metadata = {
  title: "TrafegoAI — Google, Meta e TikTok Ads em um só painel, otimizados por IA",
  description:
    "Gestor de tráfego pago com IA: dashboard unificado de Google, Meta e TikTok Ads, recomendações acionáveis, automações e a máquina de inteligência de tendências (produtos e vídeos em alta).",
  keywords: ["gestor de tráfego", "google ads", "meta ads", "tiktok ads", "IA", "ROAS", "marketing"],
  openGraph: {
    title: "TrafegoAI",
    description: "Todas as suas campanhas do Google, Meta e TikTok em um só painel — otimizadas por IA.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${grotesk.variable}`}>
      <body className="font-sans">
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('trafegoai_theme');if(t==='light')document.documentElement.classList.add('light');}catch(e){}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
