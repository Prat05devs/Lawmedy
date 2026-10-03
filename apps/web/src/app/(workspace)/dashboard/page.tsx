import Link from "next/link";
import { redirect } from "next/navigation";
import { api, getMe, Matter, Notification, date, statusLabel } from "@/lib/api";
import { markNotificationsRead } from "@/lib/actions";
export const metadata = { title: "My matters" };

export default async function Dashboard() {
  const [user, matters, notifications] = await Promise.all([
    getMe(),
    api<Matter[]>("/matters"),
    api<Notification[]>("/users/notifications"),
  ]);
  if (user.role === "ADVOCATE") redirect("/advocate");
  const unread = notifications.filter((n) => !n.readAt);
  const open = matters.filter((m) => m.status !== "COMPLETED").length;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Hello, {user.fullName.split(" ")[0]}</h1>
          <p className="muted">
            {matters.length === 0
              ? "You have not started a matter yet."
              : `${matters.length} ${matters.length === 1 ? "matter" : "matters"}, ${open} in progress, ${matters.length - open} completed.`}
          </p>
        </div>
        <div className="heading-actions">
          <Link className="button primary" href="/matters/new">New legal notice</Link>
          <Link className="button outline" href="/matters/new/rti">New RTI application</Link>
        </div>
      </div>

      {unread.length > 0 && (
        <section className="notice-list" aria-label="Updates">
          <h2>Updates</h2>
          {unread.map((n) => (
            <Link href={`/matters/${n.matterId}`} key={n.id}>
              <strong>{n.title}</strong>
              <span>{n.message}</span>
            </Link>
          ))}
          <form action={markNotificationsRead}><button className="text-button">Mark all as read</button></form>
        </section>
      )}

      <section className="matters-section">
        <h2>Matters</h2>
        {matters.length ? (
          <div className="matter-table">
            {matters.map((m) => (
              <Link href={`/matters/${m.id}`} className="matter-line" key={m.id}>
                <div>
                  <strong>{m.type === "LEGAL_NOTICE" ? "Legal notice" : "RTI application"}</strong>
                  <small>{m.referenceNumber}</small>
                </div>
                <p>{m.statements[0]?.statement || "No statement added yet."}</p>
                <span className="status-text">{statusLabel[m.status]}</span>
                <time>{date(m.createdAt)}</time>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-line">
            Start with a <Link href="/matters/new">legal notice</Link> or an <Link href="/matters/new/rti">RTI application</Link>.
            Write what happened in your own words. You confirm every fact before anything is drafted.
          </p>
        )}
      </section>
    </>
  );
}
