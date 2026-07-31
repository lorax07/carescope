import { useEffect, useRef, useState } from "react";

type DemoVideo = {
  id: string;
  title: string;
  description: string;
  src: string;
  poster: string;
};

const DEMOS: DemoVideo[] = [
  {
    id: "lifecycle",
    title: "Sample Lifecycle",
    description: "Track accessioning through result release in one flow.",
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    poster: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg",
  },
  {
    id: "analytics",
    title: "Data & Analytics",
    description: "Operational dashboards and turnaround insights.",
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    poster: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerEscapes.jpg",
  },
  {
    id: "quality",
    title: "Lab Quality Management",
    description: "QC events, CAPAs, and audit-ready history.",
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    poster: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerFun.jpg",
  },
  {
    id: "billing",
    title: "Billing",
    description: "Claims, invoices, and payer workflows in-platform.",
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    poster: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerJoyrides.jpg",
  },
  {
    id: "portal",
    title: "Customer Portal",
    description: "Client ordering, status, and report delivery.",
    src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    poster: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerMeltdowns.jpg",
  },
];

type FeatureDemoCarouselProps = {
  open: boolean;
  onClose: () => void;
};

export function FeatureDemoCarousel({ open, onClose }: FeatureDemoCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) {
      setPlayingId(null);
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (playingId) setPlayingId(null);
        else onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, playingId, onClose]);

  useEffect(() => {
    const video = playerRef.current;
    if (!video || !playingId) return;
    void video.play().catch(() => {
      /* autoplay may be blocked; controls remain available */
    });
  }, [playingId]);

  if (!open) return null;

  const playing = DEMOS.find((demo) => demo.id === playingId) ?? null;

  function goTo(index: number) {
    const next = (index + DEMOS.length) % DEMOS.length;
    setActiveIndex(next);
    const el = trackRef.current?.children[next] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }

  return (
    <div className="demo-carousel-root" role="presentation">
      <button
        type="button"
        className="demo-carousel-backdrop"
        aria-label="Close feature demos"
        onClick={onClose}
      />

      {playing ? (
        <div
          className="demo-player"
          role="dialog"
          aria-modal="true"
          aria-label={`Playing ${playing.title}`}
        >
          <header className="demo-player-header">
            <div>
              <p className="demo-player-kicker">Feature demo</p>
              <h2>{playing.title}</h2>
            </div>
            <button
              type="button"
              className="demo-carousel-close"
              aria-label="Close video"
              onClick={() => setPlayingId(null)}
            >
              Close
            </button>
          </header>
          <video
            key={playing.id}
            ref={playerRef}
            className="demo-player-video"
            src={playing.src}
            poster={playing.poster}
            controls
            playsInline
          />
          <p className="demo-player-desc">{playing.description}</p>
        </div>
      ) : (
        <div
          className="demo-carousel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-carousel-title"
        >
          <header className="demo-carousel-header">
            <div>
              <p className="demo-carousel-kicker">OneLab demos</p>
              <h2 id="demo-carousel-title">See the platform in action</h2>
              <p className="demo-carousel-lede">
                Browse five feature walkthroughs. Click a video to expand and play.
              </p>
            </div>
            <button
              type="button"
              className="demo-carousel-close"
              aria-label="Close demos"
              onClick={onClose}
            >
              ×
            </button>
          </header>

          <div className="demo-carousel-stage">
            <button
              type="button"
              className="demo-carousel-nav"
              aria-label="Previous demo"
              onClick={() => goTo(activeIndex - 1)}
            >
              ‹
            </button>

            <div className="demo-carousel-track" ref={trackRef}>
              {DEMOS.map((demo, index) => (
                <button
                  key={demo.id}
                  type="button"
                  className={`demo-carousel-card${index === activeIndex ? " is-active" : ""}`}
                  onClick={() => {
                    setActiveIndex(index);
                    setPlayingId(demo.id);
                  }}
                  aria-label={`Play ${demo.title} demo`}
                >
                  <span className="demo-carousel-thumb">
                    <img src={demo.poster} alt="" />
                    <span className="demo-carousel-play" aria-hidden="true">
                      ▶
                    </span>
                  </span>
                  <span className="demo-carousel-card-copy">
                    <strong>{demo.title}</strong>
                    <small>{demo.description}</small>
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="demo-carousel-nav"
              aria-label="Next demo"
              onClick={() => goTo(activeIndex + 1)}
            >
              ›
            </button>
          </div>

          <div className="demo-carousel-dots" role="tablist" aria-label="Demo slides">
            {DEMOS.map((demo, index) => (
              <button
                key={demo.id}
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                className={`demo-carousel-dot${index === activeIndex ? " is-active" : ""}`}
                aria-label={`Show ${demo.title}`}
                onClick={() => goTo(index)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
