import type { CapacitorConfig } from "@capacitor/cli";
import appMetadata from "./store/app-metadata.json";

const config: CapacitorConfig = {
  appId: appMetadata.appId,
  appName: appMetadata.appName,
  webDir: "dist",
  backgroundColor: "#111111",
};

export default config;
