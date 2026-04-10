import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent webpack from bundling native Node.js packages that use net/tls sockets.
  // These must run as-is in the Node.js runtime (server-side only).
  serverExternalPackages: ["imapflow", "nodemailer", "mailparser", "@google/genai"],
};

export default nextConfig;
