import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Dev mode mein standard reloading slow na ho isliye dev par disabled rahega
});

const nextConfig: NextConfig = {
  /* Aapki normal dynamic configs yahan rahengi */
};

export default withPWA(nextConfig);