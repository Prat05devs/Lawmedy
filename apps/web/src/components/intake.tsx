"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { retryIntake, saveAnswers } from "@/lib/actions";
import type { Intake } from "@/lib/intake-types";

export function IntakePanel({
  id,
  intake,
  readOnly,
}: {
  id: string;
  intake: Intake;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    retryIntake.bind(null, id),
    {},
  );

  useEffect(() => {
    if (intake.status !== "RUNNING") return;
    const timer = window.setInterval(() => router.refresh(), 3000);
    return () => window.clearInterval(timer);
  }, [intake.status, router]);

  if (intake.analysis) {
    return (
      <AnalysisPanel
        key={intake.analysis.id}
        id={id}
        analysis={intake.analysis}
        allAnswered={!!intake.allAnswered}
        readOnly={readOnly}
      />
    );
  }

  return (
    <section className="panel intake-panel" aria-live="polite">
      <div className="panel-heading">
        <span className="step-number">02</span>
        <div>
          <h2>Understanding your situation</h2>
          <p className="muted small">
            A few details can help make your story clearer.
          </p>
        </div>
      </div>
      {intake.status === "RUNNING" || pending ? (
        <p className="intake-progress" role="status">
          <LoaderCircle className="spin" size={19} /> Reading your statement and
          preparing follow-up questions…
        </p>
      ) : (
        <>
          <p className="muted">
            {intake.status === "FAILED"
              ? intake.message
              : "Your statement is saved. Analyse it to see a summary and follow-up questions."}
          </p>
          {!readOnly && (
            <form action={action}>
              <button className="button outline" disabled={pending}>
                <RefreshCw size={16} />
                {intake.status === "FAILED"
                  ? "Retry analysis"
                  : "Analyse my statement"}
              </button>
            </form>
          )}
        </>
      )}
      {state.error && (
        <p className="message error" role="alert">
          {state.error}
        </p>
      )}
    </section>
  );
}

function AnalysisPanel({
  id,
  analysis,
  allAnswered,
  readOnly,
}: {
  id: string;
  analysis: NonNullable<Intake["analysis"]>;
  allAnswered: boolean;
  readOnly: boolean;
}) {
  const [state, action, pending] = useActionState(
    saveAnswers.bind(null, id, analysis.id),
    {},
  );
  return (
    <section className="panel intake-panel">
      <div className="panel-heading">
        <span className="step-number">02</span>
        <div>
          <h2>Here’s what we understood</h2>
          <p className="muted small">Based on your saved statement.</p>
        </div>
      </div>
      <span className="intake-category">
        <Sparkles size={14} />
        {analysis.category.toLowerCase().replaceAll("_", " ")}
      </span>
      <p className="intake-summary">{analysis.summary}</p>
      <p className="field-note">
        AI-generated summary, not legal advice. Check it against your account;
        edit your statement above if anything is incorrect.
      </p>
      {!!analysis.facts.length && (
        <div className="intake-facts">
          <h3>What you’ve told us</h3>
          <dl>
            {analysis.facts.map((fact, index) => (
              <div key={`${fact.key}-${index}`}>
                <dt>{fact.key.replaceAll("_", " ")}</dt>
                <dd>
                  {fact.value}
                  <details>
                    <summary>From your statement</summary>
                    <q>{fact.sourceQuote}</q>
                  </details>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      <div className="intake-questions">
        <h3>A few follow-up questions</h3>
        <p className="muted small">
          Answer in your own words. If you’re unsure, say so rather than
          guessing.
        </p>
        {allAnswered && (
          <div className="message success" role="status">
            <CheckCircle2 size={18} /> All follow-up questions are answered and
            saved.
          </div>
        )}
        <form action={action} className="form-stack">
          {analysis.questions.map((question, index) => (
            <label key={question.id}>
              {index + 1}. {question.question}
              <textarea
                name={`answer:${question.id}`}
                rows={2}
                minLength={1}
                maxLength={5000}
                required
                defaultValue={question.answer?.answer ?? ""}
                placeholder="Your answer…"
                disabled={readOnly}
              />
            </label>
          ))}
          {!readOnly && (
            <button className="button primary" disabled={pending}>
              {pending && <LoaderCircle className="spin" size={17} />}
              {pending
                ? "Saving answers…"
                : allAnswered
                  ? "Update answers"
                  : "Save answers"}
            </button>
          )}
          {state.error && (
            <p className="message error" role="alert">
              {state.error}
            </p>
          )}
          {state.success && (
            <p className="message success" role="status">
              {state.success}
            </p>
          )}
        </form>
      </div>
      <p className="field-note intake-footnote">
        Updating your statement starts a new analysis. Earlier questions and
        answers remain in the matter history but are not copied into the new
        intake.
      </p>
    </section>
  );
}
