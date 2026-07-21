import React, { useEffect, useRef, useState } from "react";
import { GOOGLE_CLIENT_ID } from "../api/client";

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(check);
          resolve();
        }
      }, 50);
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Renders Google's own "Sign in with Google" button and forwards the
 * resulting ID token credential to `onCredential`. If no client ID has been
 * configured (VITE_GOOGLE_CLIENT_ID), shows an explanatory disabled state
 * instead of a broken button.
 */
export default function GoogleSignInButton({ onCredential, text = "continue_with" }) {
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => onCredential(response.credential),
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text,
          shape: "pill",
          width: containerRef.current.offsetWidth || 320,
        });
        setReady(true);
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div
        className="w-full flex items-center justify-center gap-2 rounded-full border border-border dark:border-white/10 bg-bg dark:bg-white/5 text-ink-faint dark:text-white/30 text-sm font-medium py-2.5 cursor-not-allowed"
        title="Set VITE_GOOGLE_CLIENT_ID to enable Google sign-in"
      >
        <GoogleMark />
        Google sign-in not configured
      </div>
    );
  }

  return (
    <div>
      <div ref={containerRef} className="flex justify-center [&>div]:w-full" />
      {!ready && !failed && <p className="text-xs text-ink-faint dark:text-white/30 text-center mt-1">Loading Google sign-in…</p>}
      {failed && <p className="text-xs text-bad text-center mt-1">Couldn't load Google sign-in.</p>}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.35-1.7 3.96-5.5 3.96-3.31 0-6.02-2.74-6.02-6.06s2.7-6.06 6.02-6.06c1.89 0 3.16.8 3.89 1.5l2.65-2.55C16.94 3.4 14.7 2.4 12 2.4 6.98 2.4 2.9 6.48 2.9 11.5s4.08 9.1 9.1 9.1c5.25 0 8.74-3.69 8.74-8.89 0-.6-.07-1.05-.15-1.5H12z" />
    </svg>
  );
}
