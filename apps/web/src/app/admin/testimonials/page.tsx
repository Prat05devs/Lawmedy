import { api } from "@/lib/api";
import { TestimonialForm, type TestimonialRow } from "@/components/admin-forms";

export default async function AdminTestimonials() {
  const items = await api<TestimonialRow[]>("/admin/testimonials");
  return (
    <>
      <div className="page-heading"><div><h1>Testimonials</h1>
        <p className="muted">Only real customers, and only with their permission. Published ones appear on the website and in the app. If none are published, that section stays hidden.</p></div></div>
      <TestimonialForm />
      {items.map((item) => <TestimonialForm key={item.id} item={item} />)}
    </>
  );
}
