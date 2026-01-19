import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: [
    'panoptic-unsensitively-jazlyn.ngrok-free.dev',
    '*.ngrok-free.dev',
    '*.ngrok.io',
  ],


  /* config options here */
};

export default nextConfig;
