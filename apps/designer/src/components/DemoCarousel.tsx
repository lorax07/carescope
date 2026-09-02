import { useEffect, useRef, useState } from "react";

const DEMOS = [
  {
    src: "/demos/01-dashboard.mp4",
    title: "Laboratory operations dashboard",
    lede: "Live sample queue, STAT load, and instrument status in one view.",
  },
  {
    src: "/demos/02-samples.mp4",
    title: "Sample lifecycle worklist",
    lede: "Track accessioning through testing, review, and release.",
  },
  {
    src: "/demos/03-workflows.mp4",
    title: "Visual workflow automation",
    lede: "No-code templates for receive, testing, CAPA, and CoA.",
  },
  {
    src: "/demos/04-instruments.mp4",
    title: "Instruments and calibration",
    lede: "See in-use, idle, and calibration-due equipment at a glance.",
  },
  {
    src: "/demos/05-platform.mp4",
    title: "OneLab unified platform",
    lede: "One native stack instead of a web of lab integrations.",
  },
] as const;

type DemoCarouselProps = {
  open: boolean;
  onRequestSignup: () => void;
};

export function DemoCarousel({ open, onRequestSignup }: DemoCarouselProps) {
  const [index, setIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) {
      setIndex(0);
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => {
      /* autoplay can be blocked until a click; controls remain */
    });
  }, [open, index]);

  if (!open) return null;

  const demo = DEMOS[index] ?? DEMOS[0];
  const go = (next: number) => {
    setIndex((next + DEMOS.length) % DEMOS.length);
  };

  return (
    <div className="demo-carousel-root" role="presentation">
      <button
        type="button"
        className="demo-carousel-backdrop"
        aria-label="Return to sandbox signup"
        onClick={onRequestSignup}
      />
      <div
        className="demo-carousel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-carousel-title"
      >
        <header className="demo-carousel-header">
          <div>
            <p className="demo-carousel-eyebrow">OneLab demos</p>
            <h2 id="demo-carousel-title">{demo.title}</h2>
            <p>{demo.lede}</p>
          </div>
          <p className="demo-carousel-count">
            {index + 1} / {DEMOS.length}
          </p>
        </header>

        <div className="demo-carousel-stage">
          <video
            key={demo.src}
            ref={videoRef}
            className="demo-carousel-video"
            src={demo.src}
            muted
            loop={false}
            playsInline
            autoPlay
            controls
            onEnded={() => go(index + 1)}
          />
        </div>

        <div className="demo-carousel-nav">
          <button
            type="button"
            className="btn"
            aria-label="Previous demo"
            onClick={() => go(index - 1)}
          >
            ← Previous
          </button>
          <div className="demo-carousel-dots" role="tablist" aria-label="Demo videos">
            {DEMOS.map((item, i) => (
              <button
                key={item.src}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Show demo ${i + 1}: ${item.title}`}
                className={`demo-carousel-dot${i === index ? " active" : ""}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            aria-label="Next demo"
            onClick={() => go(index + 1)}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
