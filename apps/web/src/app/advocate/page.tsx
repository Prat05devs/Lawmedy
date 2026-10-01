import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, CheckCircle2, Clock3, MessageCircleMore } from "lucide-react";
import { api, date } from "@/lib/api";
import type { AdvocateAssignment } from "@/lib/advocate-types";

export const metadata = { title: "Advocate queue" };

export default async function AdvocateDashboard() {
  const assignments = await api<AdvocateAssignment[]>("/advocate/matters");
  const groups = [
    {
      title: "Pending review",
      description: "Drafts ready for your attention.",
      status: "PENDING" as const,
      Icon: Clock3,
    },
    {
      title: "Waiting for user",
      description: "Information requests awaiting a response.",
      status: "WAITING_FOR_USER" as const,
      Icon: MessageCircleMore,
    },
    {
      title: "Completed",
      description: "Drafts you have approved.",
      status: "COMPLETED" as const,
      Icon: CheckCircle2,
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ASSIGNED TO YOU</p>
          <h1>Review queue</h1>
          <p className="muted">Review the facts, evidence, QA flags, and current draft.</p>
        </div>
        <span className="advocate-total"><BriefcaseBusiness size={18} /> {assignments.length} matters</span>
      </div>
      <div className="advocate-groups">
        {groups.map(({ title, description, status, Icon }) => {
          const items = assignments.filter((item) => item.status === status);
          return (
            <section className="panel advocate-queue" key={status}>
              <div className="section-heading">
                <div>
                  <h2><Icon size={18} /> {title} <span className="count">{items.length}</span></h2>
                  <p className="muted small">{description}</p>
                </div>
              </div>
              {items.length ? (
                <div className="matter-list">
                  {items.map((assignment) => (
                    <Link
                      className="matter-row advocate-row"
                      href={`/advocate/matters/${assignment.matter.id}`}
                      key={assignment.id}
                    >
                      <span className="matter-icon"><BriefcaseBusiness size={20} /></span>
                      <div className="matter-summary">
                        <span className="reference">{assignment.matter.referenceNumber}</span>
                        <h3>{assignment.matter.user.fullName}</h3>
                        <p>{assignment.matter.statements[0]?.statement || "Legal notice draft"}</p>
                      </div>
                      {assignment.newInformation && <span className="new-info">New info</span>}
                      <time>{date(assignment.assignedAt)}</time>
                      <ArrowUpRight size={18} />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="advocate-empty">No matters in this group.</p>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
