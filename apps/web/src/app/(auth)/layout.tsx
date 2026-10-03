import { Brand } from "@/components/brand";
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <Brand href="/" />
        <div className="auth-story-body">
          <h1>Legal notices and RTI applications, reviewed by an advocate.</h1>
          <p>You write what happened and confirm the facts. We draft, an advocate reviews, and you download a PDF.</p>
        </div>
        <p className="auth-foot">Your files are private. You can delete your account from inside the app.</p>
      </section>
      <section className="auth-form-area">{children}</section>
    </main>
  );
}
