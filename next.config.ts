import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Cabecalhos de seguranca em TODA resposta (#139, achado 9 da auditoria).
  // `frame-ancestors 'none'` + `X-Frame-Options: DENY`: ninguem enquadra o site,
  // entao clickjacking em "apagar lista", "seguir" e "sair" morre na origem — o
  // app nunca se auto-embute, nada quebra. `nosniff` fecha o gadget de script
  // via avatar; `Referrer-Policy` nao entrega o caminho interno a outros sites.
  async headers()
  {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

// Liga `src/i18n/request.ts` ao runtime do next-intl.
const comNextIntl = createNextIntlPlugin();

export default comNextIntl(nextConfig);
