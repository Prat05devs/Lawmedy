import { api } from "@/lib/api";
import { AdvocateRow, CreateAdvocateForm } from "@/components/admin-forms";

type Adv = { id: string; fullName: string; email: string; active: boolean; open: number; completed: number };

export default async function AdminAdvocates() {
  const advocates = await api<Adv[]>("/admin/advocates");
  return (
    <>
      <div className="page-heading"><div><h1>Advocates</h1>
        <p className="muted">The people who review and approve documents. New matters go to the least-loaded active advocate; you can reassign any matter.</p></div></div>
      <CreateAdvocateForm />
      <section className="panel admin-table">
        {advocates.length === 0 && <p className="muted">No advocates yet.</p>}
        {advocates.map((a) => <AdvocateRow key={a.id} {...a} />)}
      </section>
    </>
  );
}
