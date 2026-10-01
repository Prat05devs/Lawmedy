import Link from "next/link";
import { AuthForm } from "@/components/forms";
export const metadata = { title: "Create an account" };
export default function Signup() {
  return (
    <div className="auth-form-wrap">
      <p className="eyebrow">LET’S GET STARTED</p>
      <h2>Your next step starts here.</h2>
      <p className="muted">Create an account to start and save your matter.</p>
      <AuthForm mode="signup" />
      <p className="auth-switch">
        Already have an account?{" "}
        <Link href="/login">
          Log in <span aria-hidden>↗</span>
        </Link>
      </p>
    </div>
  );
}
