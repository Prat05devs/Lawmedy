import Link from "next/link";
import { AuthForm } from "@/components/forms";
import { GoogleButton } from "@/components/google-button";
export const metadata = { title: "Log in" };
export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: nextPath } = await searchParams;
  return (
    <div className="auth-form-wrap">
      <h2>Log in</h2>
      <p className="muted">Continue where you left off.</p>
      <GoogleButton nextPath={nextPath} />
      <AuthForm mode="login" nextPath={nextPath} />
      <p className="auth-switch">
        New to Lawmedy?{" "}
        <Link href={nextPath ? `/signup?next=${encodeURIComponent(nextPath)}` : "/signup"}>
          Create an account <span aria-hidden>↗</span>
        </Link>
      </p>
    </div>
  );
}
