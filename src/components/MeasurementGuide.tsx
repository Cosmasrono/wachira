import { MEASUREMENT_GUIDES } from "@/lib/measurements";

export default function MeasurementGuide({ fields }: { fields: string[] }) {
  return (
    <details className="detail-panel measurement-guide">
      <summary>How to take your measurements</summary>
      <p className="hint">Use a soft tape over light clothing. Keep it snug without pulling tight, breathe normally, and ask someone to help with your back and shoulders.</p>
      <div className="guide-layout">
        <svg viewBox="0 0 160 280" role="img" aria-label="Body guide showing chest, waist and hip measurement positions" className="body-guide">
          <circle cx="80" cy="28" r="18" />
          <path d="M68 47 L67 57 L42 65 L22 140 L35 145 L54 94 L57 138 L48 171 L57 258 L72 258 L80 186 L88 258 L103 258 L112 171 L103 138 L106 94 L125 145 L138 140 L118 65 L93 57 L92 47" />
          <g className="tape-lines"><path d="M47 88 H113 M55 128 H105 M49 163 H111" /></g>
          <g className="guide-labels"><text x="80" y="83">Chest / bust</text><text x="80" y="123">Waist</text><text x="80" y="158">Hips</text></g>
        </svg>
        <dl>{fields.map((field) => <div key={field}><dt>{field}</dt><dd>{MEASUREMENT_GUIDES[field] ?? "Measure this area with a soft tape. Ask us for help if you are unsure where to start or finish."}</dd></div>)}</dl>
      </div>
    </details>
  );
}
