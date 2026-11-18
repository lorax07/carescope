export function NavIcon({ name }: { name: string }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 16,
    height: 16,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "overview") {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </svg>
    );
  }
  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M4 11.5 12 5l8 6.5" />
        <path d="M7 10.5V19h10v-8.5" />
      </svg>
    );
  }
  if (name === "testing") {
    return (
      <svg {...common}>
        <path d="M9 3h6" />
        <path d="M10 3v5.5L6.5 18A3.2 3.2 0 0 0 9.4 22h5.2a3.2 3.2 0 0 0 2.9-4L14 8.5V3" />
      </svg>
    );
  }
  if (name === "review") {
    return (
      <svg {...common}>
        <rect x="6" y="3.5" width="12" height="17" rx="2" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }
  if (name === "release") {
    return (
      <svg {...common}>
        <path d="M4 8h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" />
        <path d="M8 8V6a4 4 0 0 1 8 0v2" />
      </svg>
    );
  }
  if (name === "design") {
    return (
      <svg {...common}>
        <circle cx="6" cy="7" r="2.2" />
        <circle cx="17" cy="6" r="2.2" />
        <circle cx="12" cy="17" r="2.2" />
        <path d="M8 8.2 10.4 15M15.2 7.6 13.4 15" />
      </svg>
    );
  }
  if (name === "instruments") {
    return (
      <svg {...common}>
        <rect x="4" y="7" width="16" height="10" rx="2" />
        <path d="M8 7V5h8v2M8 17v2M16 17v2" />
      </svg>
    );
  }
  if (name === "connectivity") {
    return (
      <svg {...common}>
        <circle cx="8" cy="9" r="2.2" />
        <circle cx="16" cy="9" r="2.2" />
        <path d="M4.8 18a3.4 3.4 0 0 1 6.4 0M12.8 18a3.4 3.4 0 0 1 6.4 0" />
      </svg>
    );
  }
  if (name === "quality") {
    return (
      <svg {...common}>
        <path d="M12 3.5 19 6.5v5.2c0 4.2-2.8 7.2-7 8.8-4.2-1.6-7-4.6-7-8.8V6.5L12 3.5z" />
      </svg>
    );
  }
  if (name === "billing") {
    return (
      <svg {...common}>
        <rect x="6" y="4" width="12" height="16" rx="1.5" />
        <path d="M9 9h6M9 12h6M9 15h4" />
      </svg>
    );
  }
  if (name === "clients") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="2.1" />
        <circle cx="16" cy="9" r="1.8" />
        <path d="M4.6 18.5a4.2 4.2 0 0 1 8.4 0M13.2 18.5a3.4 3.4 0 0 1 6.2 0" />
      </svg>
    );
  }
  if (name === "contacts") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="2.4" />
        <path d="M6 19a6 6 0 0 1 12 0" />
      </svg>
    );
  }
  if (name === "activities") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4.5L15 14" />
      </svg>
    );
  }
  if (name === "tasks") {
    return (
      <svg {...common}>
        <path d="M8 6h11M8 12h11M8 18h11" />
        <path d="m4 6 1.2 1.2L7.2 5M4 12l1.2 1.2L7.2 11M4 18l1.2 1.2L7.2 17" />
      </svg>
    );
  }
  if (name === "opportunities") {
    return (
      <svg {...common}>
        <path d="M5 16 10 10l3 3 6-7" />
        <path d="M15 6h4v4" />
      </svg>
    );
  }
  if (name === "health") {
    return (
      <svg {...common}>
        <path d="M12 19s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 7a3.8 3.8 0 0 1 7 2.8C19 14.6 12 19 12 19z" />
      </svg>
    );
  }
  if (name === "inbox") {
    return (
      <svg {...common}>
        <path d="M4 6h16v12H4z" />
        <path d="m4 6 8 6 8-6" />
      </svg>
    );
  }
  if (name === "communications") {
    return (
      <svg {...common}>
        <path d="M5 6h14v9H8l-3 3V6z" />
      </svg>
    );
  }
  if (name === "issues") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5M12 16.5h.01" />
      </svg>
    );
  }
  if (name === "documents") {
    return (
      <svg {...common}>
        <path d="M7 4h7l4 4v12H7V4z" />
        <path d="M14 4v4h4" />
      </svg>
    );
  }
  if (name === "analytics") {
    return (
      <svg {...common}>
        <path d="M5 19V10M10 19V5M15 19v-7M20 19V8" />
      </svg>
    );
  }
  if (name === "claims") {
    return (
      <svg {...common}>
        <rect x="5" y="4" width="14" height="16" rx="1.5" />
        <path d="M8 9h8M8 13h8M8 17h5" />
      </svg>
    );
  }
  if (name === "queues") {
    return (
      <svg {...common}>
        <path d="M4 7h16M4 12h16M4 17h10" />
      </svg>
    );
  }
  if (name === "payments") {
    return (
      <svg {...common}>
        <rect x="3.5" y="6" width="17" height="12" rx="2" />
        <path d="M3.5 10h17" />
      </svg>
    );
  }
  if (name === "denials") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="m9 9 6 6M15 9l-6 6" />
      </svg>
    );
  }
  if (name === "ar") {
    return (
      <svg {...common}>
        <path d="M5 19 9.5 8h5L19 19M7.2 14h9.6" />
      </svg>
    );
  }
  if (name === "config" || name === "admin") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 4.5v2.2M12 17.3v2.2M4.5 12h2.2M17.3 12h2.2M6.4 6.4l1.6 1.6M16 16l1.6 1.6M17.6 6.4 16 8M8 16l-1.6 1.6" />
      </svg>
    );
  }
  if (name === "events" || name === "deviations" || name === "capa" || name === "audits" || name === "complaints") {
    return (
      <svg {...common}>
        <path d="M12 4.5 20 18H4L12 4.5z" />
        <path d="M12 10v4M12 16.5h.01" />
      </svg>
    );
  }
  if (name === "training" || name === "changes" || name === "risks" || name === "equipment" || name === "suppliers" || name === "metrics") {
    return (
      <svg {...common}>
        <rect x="5" y="4" width="14" height="16" rx="2" />
        <path d="M8 9h8M8 13h8M8 17h5" />
      </svg>
    );
  }
  if (name === "migration" || name === "import") {
    return (
      <svg {...common}>
        <path d="M5 7h9M11 4l3 3-3 3" />
        <path d="M19 17H10M13 14l-3 3 3 3" />
      </svg>
    );
  }
  if (name === "mapping") {
    return (
      <svg {...common}>
        <path d="M4 7h6M4 12h6M4 17h6M14 7h6M14 17h6M10 7l4 10" />
      </svg>
    );
  }
  if (name === "duplicates") {
    return (
      <svg {...common}>
        <rect x="4" y="6" width="10" height="12" rx="1.5" />
        <rect x="10" y="4" width="10" height="12" rx="1.5" />
      </svg>
    );
  }
  if (name === "reconcile") {
    return (
      <svg {...common}>
        <path d="M5 6h6v12H5zM13 6h6v12h-6zM8 10h0M16 10h0M8 14h0" />
        <path d="M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
      </svg>
    );
  }
  if (name === "evidence") {
    return (
      <svg {...common}>
        <path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5z" />
        <path d="M14 3.5V8h4.5M8 13h8M8 17h5" />
      </svg>
    );
  }
  if (name === "templates") {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <path d="M16.5 13.5v7M13 17h7" />
      </svg>
    );
  }
  if (name === "resources" || name === "patients" || name === "inventory" || name === "sites" || name === "storage" || name === "lots" || name === "reference") {
    const mark = name === "patients" ? "M12 12a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm0 1.5c-3.2 0-6 1.6-6 3.5v1h12v-1c0-1.9-2.8-3.5-6-3.5z"
      : name === "inventory" ? "M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5z"
      : name === "sites" ? "M4 20h16M6.5 20V9L12 5l5.5 4v11"
      : name === "storage" ? "M12 20s5.5-4.6 5.5-8.2a5.5 5.5 0 0 0-11 0C6.5 15.4 12 20 12 20z"
      : name === "lots" ? "M5 7h14M5 12h14M5 17h14"
      : name === "reference" ? "M7 12a2 2 0 1 0 0 .01M16 7a2 2 0 1 0 0 .01M16 17a2 2 0 1 0 0 .01M9 11l5-3M9 13l5 3"
      : "M8 8h.01M16 8h.01M8 16h.01M16 16h.01";
    return (
      <svg {...common}>
        <path d={mark} />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M4 16.5 9 12l3 2.5 6-7" />
      <path d="M14 7.5h4.5V12" />
    </svg>
  );
}

