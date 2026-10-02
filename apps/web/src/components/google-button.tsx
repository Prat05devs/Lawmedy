"use client";
import { useEffect, useRef, useState } from "react";
import { googleSignIn } from "@/lib/actions";

type GoogleId = {
  initialize(config: { client_id: string; callback: (response: { credential: string }) => void }): void;
  renderButton(element: HTMLElement, options: Record<string, unknown>): void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

// Renders Google's own "Continue with Google" button when a client ID is configured.
export function GoogleButton() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const holder = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!clientId || !holder.current) return;
    const mount = () => {
      if (!window.google || !holder.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          const result = await googleSignIn(credential);
          if (result?.error) setError(result.error);
        },
      });
      window.google.accounts.id.renderButton(holder.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: 320,
      });
    };
    if (window.google) return mount();
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = mount;
    document.head.appendChild(script);
  }, [clientId]);

  if (!clientId) return null;
  return (
    <>
      <div ref={holder} className="google-holder" />
      {error && <div className="message error" role="alert">{error}</div>}
      <div className="divider">or use email</div>
    </>
  );
}
