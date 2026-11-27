import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Resolve legacy entry points before the client session boundary mounts.
    // A streamed page redirect can otherwise change the App Router's hook order.
    return [
      { source: "/finance", destination: "/finance/payment-tracking", permanent: false },
      { source: "/my-customers", destination: "/profile", permanent: false },
    ];
  },
};

export default nextConfig;
