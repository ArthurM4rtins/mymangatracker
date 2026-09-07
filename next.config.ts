import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
};

// Liga `src/i18n/request.ts` ao runtime do next-intl.
const comNextIntl = createNextIntlPlugin();

export default comNextIntl(nextConfig);
