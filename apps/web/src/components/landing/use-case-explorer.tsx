"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Banknote, Briefcase, Building2, House, HandCoins, Landmark, ShoppingBag, type LucideIcon } from "lucide-react";
import { pickSituation } from "@/components/home-start";
import { lifeAreas, serviceNames, type ServiceKey, type UseCase } from "@/lib/use-cases";

const icons: Record<string, LucideIcon> = {
  money: Banknote, renting: House, work: Briefcase, shopping: ShoppingBag, property: Building2, government: Landmark, lending: HandCoins,
};

const ctas: Record<ServiceKey, string> = {
  notice: "Start my legal notice",
  rti: "File an RTI application",
  lending: "Start a lending certificate",
};

// "What's happening to you?": pick a part of life, see the situations in it and the document
// that fits each one.
export function UseCaseExplorer({ prices, signedIn }: { prices: Record<ServiceKey, string>; signedIn: boolean }) {
  const [active, setActive] = useState(0);
  const area = lifeAreas[active];
  const startHref = (service: ServiceKey) => {
    const path = service === "rti" ? "/matters/new/rti" : "/matters/new/lending";
    return signedIn ? path : `/signup?next=${path}`;
  };

  const cta = (c: UseCase) =>
    c.service === "notice" ? (
      <button type="button" className="lx-case-cta" onClick={() => pickSituation(c.example ?? "")}>
        {ctas.notice} <ArrowRight aria-hidden />
      </button>
    ) : (
      <Link className="lx-case-cta" href={startHref(c.service)}>
        {ctas[c.service]} <ArrowRight aria-hidden />
      </Link>
    );

  return (
    <div className="lx-explorer">
      <div className="lx-areas" role="tablist" aria-label="Part of life">
        {lifeAreas.map((a, i) => {
          const Icon = icons[a.id];
          return (
            <button
              key={a.id}
              type="button"
              role="tab"
              id={`area-${a.id}`}
              aria-selected={i === active}
              aria-controls="area-panel"
              className="lx-area"
              onClick={() => setActive(i)}
            >
              <Icon aria-hidden /> {a.title}
            </button>
          );
        })}
      </div>
      <div id="area-panel" role="tabpanel" aria-labelledby={`area-${area.id}`}>
        <h3 className="lx-panel-title">{area.title}</h3>
        <p className="lx-panel-intro">{area.intro}</p>
        <div className="lx-cases" key={area.id}>
          {area.cases.map((c) => (
            <article key={c.title} className="lx-card lx-case">
              <h4>{c.title}</h4>
              <p>{c.text}</p>
              <div className="lx-fits"><b>{serviceNames[c.service]}</b><span>{prices[c.service]}</span></div>
              {cta(c)}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
