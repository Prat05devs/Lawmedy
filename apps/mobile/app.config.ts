import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (process.env.EAS_BUILD === "true" && (!apiUrl || !apiUrl.startsWith("https://")))
    throw new Error("Set EXPO_PUBLIC_API_URL to your HTTPS API in the selected EAS environment before building.");
  return { ...config, name: config.name ?? "Lawmedy", slug: config.slug ?? "lawmedy",
    extra: { ...config.extra, ...(apiUrl ? { apiUrl } : {}) } };
};
