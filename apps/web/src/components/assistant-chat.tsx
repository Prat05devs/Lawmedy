"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { greeting, topics, type AssistantAction, type Topic } from "@/lib/assistant";
import "./assistant-chat.css";

type Message = { id: number; from: "bot" | "me"; text: string; action?: Topic["action"] };

// Where each answer's button leads on the website.
const targets: Record<AssistantAction, string> = {
  notice: "/signup",
  rti: "/signup",
  sample: "/#top",
  how: "/#how",
  contact: "/contact",
  advocate: "/#advocates",
};

// A floating chat button with preset, team-written answers. Answers appear one bubble at a time
// after a short typing pause, like the app's assistant.
export function AssistantChat({ prices }: { prices: { notice: string; rti: string } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showTag, setShowTag] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [asked, setAsked] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const busy = useRef(false); // set synchronously, so a double click cannot start two answers
  const nextId = useRef(1);
  const log = useRef<HTMLDivElement>(null);
  const fab = useRef<HTMLButtonElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const say = useCallback((texts: string[], action?: Topic["action"]) => {
    busy.current = true;
    setTyping(true);
    let at = 0;
    texts.forEach((text, i) => {
      at += Math.min(1500, 550 + text.length * 7);
      timers.current.push(setTimeout(() => {
        setMessages((m) => [...m, { id: nextId.current++, from: "bot", text, action: i === texts.length - 1 ? action : undefined }]);
        if (i === texts.length - 1) { busy.current = false; setTyping(false); }
      }, at));
    });
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { const t = setTimeout(() => setShowTag(false), 6500); return () => clearTimeout(t); }, []);
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" }); }, [messages.length, typing]);

  const show = () => {
    setShowTag(false);
    setClosing(false);
    setOpen(true);
    if (!messages.length && !busy.current) timers.current.push(setTimeout(() => say(greeting), 250));
    setTimeout(() => closeBtn.current?.focus(), 50);
  };
  const hide = useCallback(() => {
    setClosing(true);
    setTimeout(() => { setOpen(false); setClosing(false); }, 200);
  }, []);
  // After closing, give focus back to the chat button once it is on screen again.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) wasOpen.current = true;
    else if (wasOpen.current) fab.current?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") hide(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hide]);

  const ask = (topic: Topic) => {
    if (busy.current) return;
    setAsked((a) => [...a, topic.id]);
    setMessages((m) => [...m, { id: nextId.current++, from: "me", text: topic.question }]);
    say(topic.answer(prices), topic.action);
  };
  const restart = () => {
    timers.current.forEach(clearTimeout); timers.current = [];
    busy.current = false; setTyping(false); setAsked([]); setMessages([]);
    say(greeting);
  };
  const go = (to: AssistantAction) => { hide(); router.push(targets[to]); };
  const suggestions = [...topics.filter((t) => !asked.includes(t.id)), ...topics.filter((t) => asked.includes(t.id))];

  return (
    <>
      {!open && (
        <div className="lc-fab-wrap">
          {showTag && <span className="lc-tag" aria-hidden="true">Questions? Ask us</span>}
          <button ref={fab} type="button" className="lc-fab" onClick={show} aria-label="Open the Lawmedy assistant" aria-haspopup="dialog">
            <span className="lc-ring" aria-hidden="true" />
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      )}
      {open && (
        <>
          <div className={`lc-backdrop ${closing ? "out" : ""}`} onClick={hide} aria-hidden="true" />
          <section className={`lc-panel ${closing ? "out" : ""}`} role="dialog" aria-modal="true" aria-label="Lawmedy assistant">
            <header className="lc-head">
              <span className="lc-avatar" aria-hidden="true">L</span>
              <div className="lc-head-text">
                <strong>Lawmedy assistant</strong>
                <span><i className="lc-online" aria-hidden="true" />Quick answers from the Lawmedy team</span>
              </div>
              <button type="button" className="lc-icon" onClick={restart} aria-label="Start over" title="Start over">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M1 4v6h6M3.5 15a9 9 0 1 0 2.1-9.4L1 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button ref={closeBtn} type="button" className="lc-icon" onClick={hide} aria-label="Close" title="Close">
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            </header>
            <div className="lc-log" ref={log} aria-live="polite">
              {messages.map((m) => (
                <div key={m.id} className={`lc-msg ${m.from}`}>
                  <p className="lc-bubble">{m.text}</p>
                  {m.action && <button type="button" className="lc-action" onClick={() => go(m.action!.to)}>{m.action.label} <span aria-hidden="true">→</span></button>}
                </div>
              ))}
              {typing && <div className="lc-msg bot" aria-label="Typing"><p className="lc-bubble lc-typing"><i /><i /><i /></p></div>}
            </div>
            <footer className="lc-suggest">
              <span className="lc-suggest-label">{asked.length ? "Ask something else" : "Popular questions"}</span>
              <div className="lc-chips">
                {suggestions.map((t) => (
                  <button key={t.id} type="button" disabled={typing} className={`lc-chip ${asked.includes(t.id) ? "done" : ""}`} onClick={() => ask(t)}>{t.question}</button>
                ))}
                <button type="button" className="lc-chip" onClick={() => go("contact")}>Talk to a person</button>
              </div>
            </footer>
          </section>
        </>
      )}
    </>
  );
}
