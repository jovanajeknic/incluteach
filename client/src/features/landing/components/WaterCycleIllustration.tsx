/** Small, decorative water-cycle drawing used as the "visual support" example. */
export function WaterCycleIllustration() {
  return (
    <svg viewBox="0 0 160 120" aria-hidden="true" focusable="false" className="h-auto w-full">
      {/* Sun */}
      <g className="text-gold" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <circle cx="128" cy="26" r="11" fill="currentColor" stroke="none" />
        <path d="M128 6v4M128 42v4M108 26h4M144 26h4M114 12l3 3M139 37l3 3M142 12l-3 3M117 37l-3 3" />
      </g>
      {/* Cloud */}
      <path
        d="M40 40a12 12 0 0 1 22-7 10 10 0 0 1 17 6 9 9 0 0 1-1 18H43a9 9 0 0 1-3-17z"
        className="fill-card stroke-petrol"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Rain */}
      <g className="stroke-petrol" strokeWidth="2.5" strokeLinecap="round">
        <path d="M50 64l-3 8M62 64l-3 8M74 64l-3 8" />
      </g>
      {/* Evaporation path, in the logo's rounded stroke */}
      <path
        d="M118 92c10-14 8-30-12-40"
        fill="none"
        className="stroke-apricot"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 7"
      />
      <path
        d="M101 46l7 3-2 7"
        fill="none"
        className="stroke-apricot"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Sea */}
      <path
        d="M8 100c12-8 24-8 36 0s24 8 36 0 24-8 36 0 24 8 36 0v16H8z"
        className="fill-petrol-tint stroke-petrol"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
