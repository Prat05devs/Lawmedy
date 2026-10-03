import Link from "next/link";
import { AuthForm } from "@/components/forms";
import { GoogleButton } from "@/components/google-button";
export const metadata = { title: "Log in" };
export default function Login() {
  return (
    <div className="auth-form-wrap">
      <h2>Log in</h2>
      <p className="muted">Continue where you left off.</p>
      <GoogleButton />
      <AuthForm mode="login" />
      <p className="auth-switch">
        New to Lawmedy?{" "}
        <Link href="/signup">
          Create an account <span aria-hidden>↗</span>
        </Link>
      </p>
    </div>
  );
}
