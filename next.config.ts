import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const pocketBaseOrigin = getOrigin(process.env.NEXT_PUBLIC_PB_URL);
const pocketBaseFilePattern = getPocketBaseFilePattern(process.env.NEXT_PUBLIC_PB_URL);
const serverActionAllowedOrigins = parseCsv(process.env.SERVER_ACTION_ALLOWED_ORIGINS);
const serverActions: NonNullable<NonNullable<NextConfig["experimental"]>["serverActions"]> = {
  bodySizeLimit: "10mb",
  ...(serverActionAllowedOrigins.length > 0
    ? {
        allowedOrigins: serverActionAllowedOrigins,
      }
    : {}),
};

const connectSources = [
  "'self'",
  ...(pocketBaseOrigin ? [pocketBaseOrigin] : []),
  ...(isDev ? ["http://localhost:*", "http://127.0.0.1:*", "ws://localhost:*", "ws://127.0.0.1:*"] : []),
];

const imageSources = [
  "'self'",
  "data:",
  "blob:",
  "https:",
  ...(isDev ? ["http://localhost:*", "http://127.0.0.1:*"] : []),
  ...(pocketBaseOrigin && !pocketBaseOrigin.startsWith("https:") ? [pocketBaseOrigin] : []),
];

const formActionSources = ["'self'", "https://accounts.google.com"];

const cspHeader = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src ${dedupe(imageSources).join(" ")}`,
  "font-src 'self' data:",
  `connect-src ${dedupe(connectSources).join(" ")}`,
  "object-src 'none'",
  "base-uri 'self'",
  `form-action ${dedupe(formActionSources).join(" ")}`,
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  experimental: {
    serverActions,
  },
  images: {
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      ...(pocketBaseFilePattern ? [pocketBaseFilePattern] : []),
      {
        protocol: "https",
        hostname: "coverartarchive.org",
        port: "",
        pathname: "/release-group/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "coverartarchive.org",
        port: "",
        pathname: "/release/**",
        search: "",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

function parseCsv(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getOrigin(value: string | undefined) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function getPocketBaseFilePattern(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return {
      protocol: url.protocol.slice(0, -1) as "http" | "https",
      hostname: url.hostname,
      port: url.port,
      pathname: "/api/files/**",
      search: "",
    };
  } catch {
    return null;
  }
}

function dedupe(values: string[]) {
  return [...new Set(values)];
}

export default nextConfig;
