/** Compact 3-D prism icon — used in the sidebar */
export function PrismaIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="pi-front" x1="32" y1="4" x2="32" y2="57" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0F2D6B" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="pi-right" x1="40" y1="1" x2="64" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#60A5FA" />
        </linearGradient>
        <linearGradient id="pi-bottom" x1="10" y1="50" x2="64" y2="57" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="1" stopColor="#7DD3FC" />
        </linearGradient>
        <linearGradient id="pi-shine" x1="20" y1="4" x2="45" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.18" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Bottom face */}
      <polygon points="10,55 54,55 63,49 18,49" fill="url(#pi-bottom)" />
      {/* Right face */}
      <polygon points="32,4 54,55 63,49 40,1" fill="url(#pi-right)" />
      {/* Front face */}
      <polygon points="32,4 10,55 54,55" fill="url(#pi-front)" />
      {/* Shine overlay on front face */}
      <polygon points="32,4 10,55 54,55" fill="url(#pi-shine)" />

      {/* Edge highlights */}
      <line x1="32" y1="4" x2="10" y2="55" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <line x1="32" y1="4" x2="54" y2="55" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <line x1="32" y1="4" x2="40" y2="1" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
    </svg>
  );
}

/** Full logo with 3-D prism + rainbow light dispersion — used in the login page */
export function PrismaFullLogo({ width = 220 }: { width?: number }) {
  const height = Math.round(width * (160 / 280));
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 280 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Prism faces */}
        <linearGradient id="pfl-front" x1="90" y1="18" x2="90" y2="108" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0C1E5B" />
          <stop offset="1" stopColor="#1E40AF" />
        </linearGradient>
        <linearGradient id="pfl-right" x1="110" y1="8" x2="145" y2="108" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1D4ED8" />
          <stop offset="1" stopColor="#60A5FA" />
        </linearGradient>
        <linearGradient id="pfl-bottom" x1="55" y1="98" x2="145" y2="108" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="1" stopColor="#BAE6FD" />
        </linearGradient>
        <linearGradient id="pfl-shine" x1="65" y1="18" x2="105" y2="70" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.15" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        {/* White beam */}
        <linearGradient id="pfl-beam" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="white" stopOpacity="0" />
          <stop offset="0.6" stopColor="white" stopOpacity="0.7" />
          <stop offset="1" stopColor="white" stopOpacity="0.95" />
        </linearGradient>
        {/* Ray gradients (fade to transparent at far end) */}
        <linearGradient id="ray-r"  x1="0" y1="0" x2="1" y2="0"><stop stopColor="#EF4444" stopOpacity="0.95"/><stop offset="1" stopColor="#EF4444" stopOpacity="0"/></linearGradient>
        <linearGradient id="ray-o"  x1="0" y1="0" x2="1" y2="0"><stop stopColor="#F97316" stopOpacity="0.95"/><stop offset="1" stopColor="#F97316" stopOpacity="0"/></linearGradient>
        <linearGradient id="ray-y"  x1="0" y1="0" x2="1" y2="0"><stop stopColor="#FACC15" stopOpacity="0.95"/><stop offset="1" stopColor="#FACC15" stopOpacity="0"/></linearGradient>
        <linearGradient id="ray-g"  x1="0" y1="0" x2="1" y2="0"><stop stopColor="#22C55E" stopOpacity="0.95"/><stop offset="1" stopColor="#22C55E" stopOpacity="0"/></linearGradient>
        <linearGradient id="ray-c"  x1="0" y1="0" x2="1" y2="0"><stop stopColor="#06B6D4" stopOpacity="0.95"/><stop offset="1" stopColor="#06B6D4" stopOpacity="0"/></linearGradient>
        <linearGradient id="ray-b"  x1="0" y1="0" x2="1" y2="0"><stop stopColor="#3B82F6" stopOpacity="0.95"/><stop offset="1" stopColor="#3B82F6" stopOpacity="0"/></linearGradient>
        <linearGradient id="ray-v"  x1="0" y1="0" x2="1" y2="0"><stop stopColor="#A855F7" stopOpacity="0.95"/><stop offset="1" stopColor="#A855F7" stopOpacity="0"/></linearGradient>
      </defs>

      {/* ── White input beam (left → prism left face) ── */}
      {/*  Left slant midpoint ≈ (72, 63); beam wedge */}
      <polygon
        points="0,60 72,61 72,67 0,72"
        fill="url(#pfl-beam)"
      />

      {/* ── Prism geometry ── */}
      {/* Bottom face */}
      <polygon points="55,108 125,108 145,98 75,98" fill="url(#pfl-bottom)" />
      {/* Right face */}
      <polygon points="90,18 125,108 145,98 110,8" fill="url(#pfl-right)" />
      {/* Front face */}
      <polygon points="90,18 55,108 125,108" fill="url(#pfl-front)" />
      {/* Shine */}
      <polygon points="90,18 55,108 125,108" fill="url(#pfl-shine)" />

      {/* Edge highlights */}
      <line x1="90" y1="18" x2="55" y2="108" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <line x1="90" y1="18" x2="125" y2="108" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <line x1="90" y1="18" x2="110" y2="8" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />

      {/* ── Rainbow rays (exit from right slant ~x=107, y=63) ── */}
      {/*
          Spread: red=-22° → violet=+30°
          At x=280 (Δx=173):
            red    → y = 63 + 173·tan(-22°) ≈ -7  (clip @ 0)
            orange → y = 63 + 173·tan(-12°) ≈ 26
            yellow → y = 63 + 173·tan(-4°)  ≈ 51
            green  → y = 63 + 173·tan(+5°)  ≈ 78
            cyan   → y = 63 + 173·tan(+13°) ≈ 103
            blue   → y = 63 + 173·tan(+21°) ≈ 129
            violet → y = 63 + 173·tan(+30°) ≈ 163 (≈160 edge)
      */}
      {/* Each beam: thin trapezoid, near end ~4px wide, far end ~11px wide */}
      {/* Red */}
      <polygon points="107,60 110,64 280,5  280,-4"  fill="url(#ray-r)"  />
      {/* Orange */}
      <polygon points="109,63 112,66 280,32 280,21"  fill="url(#ray-o)"  />
      {/* Yellow */}
      <polygon points="110,65 112,68 280,57 280,46"  fill="url(#ray-y)"  />
      {/* Green */}
      <polygon points="111,67 112,70 280,84 280,73"  fill="url(#ray-g)"  />
      {/* Cyan */}
      <polygon points="111,69 110,72 280,109 280,98"  fill="url(#ray-c)"  />
      {/* Blue */}
      <polygon points="110,71 108,74 280,135 280,124" fill="url(#ray-b)"  />
      {/* Violet */}
      <polygon points="108,73 105,76 280,169 280,158" fill="url(#ray-v)"  />
    </svg>
  );
}
