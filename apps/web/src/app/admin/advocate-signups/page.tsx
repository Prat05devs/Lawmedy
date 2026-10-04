import { api } from "@/lib/api";
import { AdvocateSignupRow, SignupsCsvButton, type AdvocateSignup } from "@/components/admin-forms";

export default async function AdvocateSignups() {
  const items = await api<AdvocateSignup[]>("/admin/advocate-interest");
  const fresh = items.filter((i) => i.status === "NEW").length;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Advocate sign-ups</h1>
          <p className="muted">Advocates who registered for the upcoming advocate portal from the app. {fresh ? `${fresh} not contacted yet.` : "Everyone has been contacted."} Call or WhatsApp first; most people answer the phone sooner than email.</p>
        </div>
        <SignupsCsvButton items={items} />
      </div>
      <section className="panel admin-table">
        {items.length === 0 && <p className="muted">No sign-ups yet.</p>}
        {items.map((item) => <AdvocateSignupRow key={item.id} item={item} />)}
      </section>
    </>
  );
}
