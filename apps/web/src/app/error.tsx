"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <h1>We couldn’t load this page.</h1>
      <p className="muted">
        The service may be temporarily unavailable. Your saved information has
        not been changed.
      </p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
      <Link className="back-link" href="/dashboard">
        Back to dashboard
      </Link>
    </main>
  );
}
