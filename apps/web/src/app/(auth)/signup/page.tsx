import Link from "next/link";
import { AuthForm } from "@/components/forms";
import { GoogleButton } from "@/components/google-button";
export const metadata = { title: "Create an account" };
export default async function Signup({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: nextPath } = await searchParams;
  return (
    <div className="auth-form-wrap">
      <h2>Create your account</h2>
      <p className="muted">You need an account to save your matter.</p>
      <GoogleButton nextPath={nextPath} />
      <AuthForm mode="signup" nextPath={nextPath} />
      <p className="auth-legal">
        By creating an account you agree to our <Link href="/terms">Terms of Use</Link> and{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
      <p className="auth-switch">
        Already have an account?{" "}
        <Link href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}>
          Log in <span aria-hidden>↗</span>
        </Link>
      </p>
    </div>
  );
}
