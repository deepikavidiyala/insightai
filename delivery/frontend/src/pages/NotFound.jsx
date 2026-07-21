import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg dark:bg-[#0F0D1A] px-6">
      <div className="text-center">
        <p className="font-mono text-sm text-primary font-semibold">404</p>
        <h1 className="font-display text-2xl font-semibold text-ink dark:text-white mt-2">Page not found</h1>
        <p className="text-ink-soft dark:text-white/50 mt-2">The page you're looking for doesn't exist.</p>
        <Link
          to="/"
          className="inline-flex mt-6 bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors focus-ring"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
