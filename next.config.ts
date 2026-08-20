import type { NextConfig } from "next";
import { securityHeaders } from "./src/config/security-headers";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders(
          process.env.NODE_ENV === "production" ? "production" : "development",
        ),
      },
    ];
  },
};
export default nextConfig;
