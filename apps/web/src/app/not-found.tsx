import Link from "next/link";
export default function NotFound() {
  return (
    <main className="error-page">
      <h1>We couldn’t find that matter.</h1>
      <p className="muted">It may not exist or belong to your account.</p>
      <Link className="button primary" href="/dashboard">
        Back to dashboard
      </Link>
    </main>
  );
}
