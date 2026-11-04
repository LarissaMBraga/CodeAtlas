const nodes = [
  { name: "src/app", type: "entry", position: "left-[50%] top-[20%]" },
  { name: "features", type: "primary", position: "left-[21%] top-[49%]" },
  { name: "components", type: "primary", position: "left-[50%] top-[49%]" },
  { name: "lib", type: "primary", position: "left-[79%] top-[49%]" },
  { name: "analyzer", type: "secondary", position: "left-[29%] top-[80%]" },
  { name: "types", type: "secondary", position: "left-[71%] top-[80%]" },
] as const;

export default function ArchitecturePreview() {
  return (
    <div className="relative mx-auto h-[390px] w-full max-w-[620px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d14]">
      <div className="atlas-grid absolute inset-0 opacity-60" />

      <div className="absolute left-5 top-5 z-10 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-[#9b7bff]" />
        <span className="text-xs font-medium tracking-wide text-[#aaa6b8]">
          SOFTWARE DEPENDENCY MAP
        </span>
      </div>

      <div className="absolute right-5 top-5 z-10 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-[#aaa6b8]">
        DEMO STRUCTURE
      </div>

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 620 390"
        fill="none"
        preserveAspectRatio="none"
      >
        <g stroke="#8065c4" strokeOpacity=".45" strokeWidth="1.4">
          <path d="M310 105 V137 H130 V169" />
          <path d="M310 105 V169" />
          <path d="M310 105 V137 H490 V169" />
          <path d="M130 215 V245 H180 V292" />
          <path d="M310 215 V255 H440 V292" />
          <path d="M490 215 V245 H440 V292" />
        </g>

        <g fill="#a98cff">
          <circle cx="310" cy="137" r="3" />
          <circle cx="130" cy="137" r="3" />
          <circle cx="490" cy="137" r="3" />
          <circle cx="180" cy="245" r="3" />
          <circle cx="440" cy="255" r="3" />
        </g>
      </svg>

      {nodes.map((node) => (
        <div
          key={node.name}
          className={`absolute z-10 ${node.position} -translate-x-1/2 -translate-y-1/2`}
        >
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 shadow-xl ${
              node.type === "entry"
                ? "border-[#9b7bff]/50 bg-[#211b35] shadow-[0_0_25px_rgba(155,123,255,0.12)]"
                : node.type === "primary"
                  ? "border-[#9b7bff]/25 bg-[#191625]"
                  : "border-white/10 bg-[#17171f]"
            }`}
          >
            <div
              className={`h-2 w-2 rounded-full ${
                node.type === "entry"
                  ? "bg-[#b7a1ff]"
                  : node.type === "primary"
                    ? "bg-[#9b7bff]"
                    : "bg-[#77718d]"
              }`}
            />

            <span className="whitespace-nowrap font-mono text-[11px] text-[#e5dff7]">
              {node.name}
            </span>
          </div>
        </div>
      ))}

      <div className="absolute bottom-5 left-5 z-10 flex gap-5 text-[10px] text-[#777483]">
        <span>Application</span>
        <span>Modules</span>
        <span>Dependencies</span>
      </div>
    </div>
  );
}