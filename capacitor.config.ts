import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pruden.technologies.command",
  appName: "PRUDEN Command",
  webDir: "dist",
  server: {
    // Keep the Android shell connected to the authenticated, deployed app.
    // This avoids embedding Supabase build secrets in the APK.
    url: "https://pruden-command-secure.onrender.com",
    cleartext: false,
    allowNavigation: ["pruden-command-secure.onrender.com", "pruden-technologies.onrender.com"],
  },
  android: { allowMixedContent: false },
};

export default config;
