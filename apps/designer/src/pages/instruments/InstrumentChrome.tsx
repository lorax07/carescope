import type { ReactNode } from "react";
import { ModuleChapters, type ModuleChapter } from "../moduleChapters";

export const INSTRUMENT_CHAPTERS: ModuleChapter[] = [
  {
    id: "registry",
    to: "/app/instruments",
    end: true,
    label: "Registry",
    question: "What is connected, and what is ready to run.",
    tools: [],
  },
  {
    id: "queue",
    to: "/app/instruments/queue",
    label: "Queue",
    question: "Prepare a sequence, then submit it to the adapter.",
    tools: [],
  },
  {
    id: "acquire",
    to: "/app/instruments/acquire",
    label: "Acquisition",
    question: "Runs the acquisition service has confirmed.",
    tools: [],
  },
  {
    id: "review",
    to: "/app/instruments/review",
    label: "Review",
    question: "Stored chromatograms, peaks, and provenance.",
    tools: [],
  },
];

export function InstrumentChrome({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <div className="lims-page">
      <div className="lims-page-header">
        <div>
          <p className="lims-eyebrow">Sequence Instruments</p>
          <h1>{title}</h1>
          <p className="lims-page-lede">{lede}</p>
        </div>
      </div>
      <ModuleChapters chapters={INSTRUMENT_CHAPTERS} label="Sequence Instrument areas" />
      {children}
    </div>
  );
}
