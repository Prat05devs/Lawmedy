import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Plus,
  Clock3,
  CheckCircle2,
  ArrowRight,
  Bell,
} from "lucide-react";
import { api, Matter, Notification, User, date, statusLabel } from "@/lib/api";
export const metadata = { title: "My matters" };
export default async function Dashboard() {
  const [user, matters, notifications] = await Promise.all([
    api<User>("/users/me"),
    api<Matter[]>("/matters"),
    api<Notification[]>("/users/notifications"),
  ]);
  if (user.role === "ADVOCATE") redirect("/advocate");
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A CLEARER WAY FORWARD</p>
          <h1>
            Hello, {user.fullName.split(" ")[0]}
            <span className="greeting-dot">.</span>
          </h1>
          <p className="muted">
            Your matters, your progress. All in one place.
          </p>
        </div>
        <div className="heading-actions">
          <Link className="button primary" href="/matters/new">
            <Plus size={18} /> New Legal Notice
          </Link>
          <Link className="button outline" href="/matters/new/rti">
            <Plus size={18} /> Draft an RTI
          </Link>
        </div>
      </div>
      {notifications.length > 0 && (
        <section className="notification-list" aria-label="Notifications">
          {notifications.map((notification) => (
            <Link href={`/matters/${notification.matterId}`} key={notification.id}>
              <Bell size={17} />
              <span>
                <strong>{notification.title}</strong>
                <small>{notification.message}</small>
              </span>
              <ArrowRight size={15} />
            </Link>
          ))}
        </section>
      )}
      <section className="welcome-banner">
        <Image src="/images/photos/india-gate.jpg" alt="" fill sizes="(max-width: 1300px) 100vw, 1200px" className="banner-photo" />
        <div>
          <span className="banner-tag">ONE STEP AT A TIME</span>
          <h2>
            Every resolution starts
            <br />
            with your story.
          </h2>
          <p>
            Put what happened into words.
            <br />
            We’ll keep it safe while you take the next step.
          </p>
          <Link href="/matters/new" className="text-link">
            Start a legal notice <ArrowRight size={17} />
          </Link>
        </div>
      </section>
      <section className="stats" aria-label="Matter totals">
        {[
          { label: "Total matters", value: matters.length, Icon: FileText },
          {
            label: "In progress",
            value: matters.filter((m) => m.status !== "COMPLETED").length,
            Icon: Clock3,
          },
          {
            label: "Completed",
            value: matters.filter((m) => m.status === "COMPLETED").length,
            Icon: CheckCircle2,
          },
        ].map(({ label, value, Icon }) => (
          <div className="stat" key={label}>
            <div>
              <span>{label}</span>
              <strong>{String(value).padStart(2, "0")}</strong>
            </div>
            <span className="stat-icon">
              <Icon size={20} />
            </span>
          </div>
        ))}
      </section>
      <section className="matters-section">
        <div className="section-heading">
          <h2>
            My matters <span className="count">{matters.length}</span>
          </h2>
          <span className="muted small">Most recent first</span>
        </div>
        {matters.length ? (
          <div className="matter-list">
            {matters.map((m) => (
              <Link href={`/matters/${m.id}`} className="matter-row" key={m.id}>
                <span className="matter-thumb">
                  <Image src={m.type === "RTI" ? "/images/photos/rashtrapati.jpg" : "/images/photos/signing.jpg"} alt="" fill sizes="76px" />
                </span>
                <div className="matter-summary">
                  <span className="reference">{m.referenceNumber}</span>
                  <h3>{m.type === "LEGAL_NOTICE" ? "Legal notice" : "RTI"}</h3>
                  <p>
                    {m.statements[0]?.statement ||
                      "Your matter is ready. Add your statement to get started."}
                  </p>
                </div>
                <span className={`badge ${m.status.toLowerCase()}`}>
                  <span />
                  {statusLabel[m.status]}
                </span>
                <time>{date(m.createdAt)}</time>
                <ArrowUpRight size={19} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">
              <FileText size={30} strokeWidth={1.3} />
              <span>
                <Plus size={13} />
              </span>
            </div>
            <h3>A fresh start, right here.</h3>
            <p>
              You haven’t started a matter yet.
              <br />
              When you’re ready, tell us what happened.
            </p>
            <Link className="button outline" href="/matters/new">
              Create your first matter <ArrowUpRight size={16} />
            </Link>
          </div>
        )}
      </section>
      <div className="bottom-note">
        <ArrowDownLeft size={17} />
        <p>No legal jargon needed. Start with the facts, in your own words.</p>
      </div>
    </>
  );
}
