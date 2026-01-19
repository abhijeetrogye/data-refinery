import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: [
    'panoptic-unsensitively-jazlyn.ngrok-free.dev',
    '*.ngrok-free.dev',
    '*.ngrok.io',
  ],

  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  },
  /* config options here */
};

export default nextConfig;
