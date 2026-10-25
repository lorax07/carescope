import { FormEvent, useEffect, useRef, useState } from "react";

type SandboxSignupModalProps = {
  open: boolean;
  onClose: () => void;
};

type SignupMode = "form" | "demos";

const DEMOS = [
  {
    title: "Lab Operations",
    caption: "Open the laboratory queue and design the workflow.",
    start: 3,
    end: 14,
  },
  {
    title: "Instrument integration",
    caption: "Connect instruments, worklists, and result ingestion.",
    start: 17,
    end: 27,
  },
  {
    title: "Sequence Insights",
    caption: "Ask a question about turnaround time from the laboratory’s own work.",
    start: 28,
    end: 42,
  },
] as const;

export function SandboxSignupModal({ open, onClose }: SandboxSignupModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [mode, setMode] = useState<SignupMode>("form");
  const [activeDemo, setActiveDemo] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const programmaticScroll = useRef(false);

  useEffect(() => {
    if (open) return;
    setSubmitted(false);
    setMode("form");
    setActiveDemo(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    titleRef.current?.focus();
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  function showDemos() {
    setMode("demos");
    setActiveDemo(0);
  }

  function scrollToDemo(index: number) {
    const track = trackRef.current;
    if (!track) return;
    const next = (index + DEMOS.length) % DEMOS.length;
    const card = track.querySelectorAll("article")[next];
    if (!(card instanceof HTMLElement)) return;
    setActiveDemo(next);
    programmaticScroll.current = true;
    const left =
      card.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;
    track.scrollTo({ left, behavior: "smooth" });
    window.setTimeout(() => {
      programmaticScroll.current = false;
    }, 480);
  }

  function syncActiveDemo() {
    if (programmaticScroll.current) return;
    const track = trackRef.current;
    if (!track) return;
    const width = track.clientWidth || 1;
    const index = Math.max(0, Math.min(DEMOS.length - 1, Math.round(track.scrollLeft / width)));
    setActiveDemo((current) => (current === index ? current : index));
  }

  const showingDemos = mode === "demos" && !submitted;

  return (
    <div className="signup-modal-root" role="presentation">
      <button
        type="button"
        className="signup-modal-backdrop"
        aria-label="Close signup dialog"
        onClick={onClose}
      />
      <div
        className={`signup-modal${showingDemos ? " is-demos" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-modal-title"
      >
        <header className="signup-modal-header">
          <div>
            <p className="signup-modal-kicker">Sequence</p>
            <h2 id="signup-modal-title" tabIndex={-1} ref={titleRef}>
              {showingDemos ? "See Sequence in the laboratory" : "Try Sequence free for 30 days"}
            </h2>
          </div>
          <button
            type="button"
            className="signup-modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        {submitted ? (
          <div className="signup-modal-success">
            <p>Account request received. Your Sequence sandbox will be ready shortly.</p>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Continue to app
            </button>
          </div>
        ) : showingDemos ? (
          <div className="signup-demos">
            <p className="signup-modal-lede">
              Three chapters from the Sequence film. Use the arrows to move across the laboratory.
            </p>
            <div
              className="signup-carousel"
              ref={trackRef}
              role="region"
              aria-roledescription="carousel"
              aria-label="Sequence demo videos"
              onScroll={syncActiveDemo}
            >
              {DEMOS.map((demo, index) => (
                <article key={demo.title} aria-label={`${index + 1} of ${DEMOS.length}: ${demo.title}`}>
                  <DemoClip
                    title={demo.title}
                    start={demo.start}
                    end={demo.end}
                    active={activeDemo === index}
                  />
                  <h3>{demo.title}</h3>
                  <p>{demo.caption}</p>
                </article>
              ))}
            </div>
            <div className="signup-carousel-nav">
              <button type="button" className="btn" onClick={() => scrollToDemo(activeDemo - 1)}>
                Previous
              </button>
              <div className="signup-carousel-dots" role="tablist" aria-label="Demo chapters">
                {DEMOS.map((demo, index) => (
                  <button
                    key={demo.title}
                    type="button"
                    role="tab"
                    aria-selected={activeDemo === index}
                    aria-label={demo.title}
                    className={activeDemo === index ? "is-active" : ""}
                    onClick={() => scrollToDemo(index)}
                  />
                ))}
              </div>
              <button type="button" className="btn" onClick={() => scrollToDemo(activeDemo + 1)}>
                Next
              </button>
            </div>
          </div>
        ) : (
          <form className="signup-modal-form" onSubmit={handleSubmit}>
            <p className="signup-modal-lede">
              Create an account to explore Sequence with full sandbox access for 30 days.
            </p>

            <label>
              Full name
              <input name="name" type="text" required autoComplete="name" />
            </label>
            <label>
              Work email
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <label>
              Organization
              <input
                name="organization"
                type="text"
                required
                autoComplete="organization"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>

            <div className="signup-modal-actions">
              <button type="button" className="btn" onClick={showDemos}>
                Not now
              </button>
              <button type="submit" className="btn btn-primary">
                Create account
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function DemoClip({
  title,
  start,
  end,
  active,
}: {
  title: string;
  start: number;
  end: number;
  active: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!active) {
      video.pause();
      return;
    }
    const playFromStart = () => {
      if (video.currentTime < start || video.currentTime >= end - 0.2) {
        video.currentTime = start;
      }
      video.play().catch(() => {});
    };
    if (video.readyState >= 1) playFromStart();
    else video.addEventListener("loadedmetadata", playFromStart, { once: true });
  }, [active, start, end]);

  return (
    <video
      ref={videoRef}
      src="/lims-in-action.mp4"
      muted
      playsInline
      controls
      preload="metadata"
      aria-label={title}
      onTimeUpdate={(event) => {
        const video = event.currentTarget;
        if (video.currentTime >= end) {
          video.pause();
          video.currentTime = start;
        }
      }}
    />
  );
}
