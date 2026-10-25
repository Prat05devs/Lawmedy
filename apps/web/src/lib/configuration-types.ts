export type ProviderConfiguration = {
  editable: boolean;
  revision: number;
  paymentMode: "live" | "test" | "manual";
  razorpay: {
    mode: "live" | "test";
    configured: boolean;
    keyHint: string | null;
    hasKeySecret: boolean;
    hasWebhookSecret: boolean;
    updatedAt: string | null;
  }[];
  gemini: {
    model: string;
    fallbackModels: string[];
    keys: {
      id: string;
      label: string;
      enabled: boolean;
      priority: number;
      updatedAt: string;
    }[];
  };
  audit: { id: string; action: string; createdAt: string }[];
};
