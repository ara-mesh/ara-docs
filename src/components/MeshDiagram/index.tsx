import type {ReactNode} from 'react';
import styles from './styles.module.css';

type NodeKind = 'hub' | 'mqtt' | 'udp' | 'lora';

type NodeDef = {
  cx: number;
  cy: number;
  label: string;
  tx: string;
  kind: NodeKind;
};

const nodes: NodeDef[] = [
  {cx: 280, cy: 220, label: 'ICP',  tx: 'MQTT',  kind: 'hub'},
  {cx: 130, cy: 160, label: 'T-1',  tx: 'UDP',   kind: 'udp'},
  {cx: 390, cy: 120, label: 'T-2',  tx: 'MQTT',  kind: 'mqtt'},
  {cx: 420, cy: 330, label: 'T-3',  tx: 'LoRa',  kind: 'lora'},
  {cx: 120, cy: 360, label: 'T-4',  tx: 'LoRa',  kind: 'lora'},
];

const edges: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [0, 4], [3, 4],
];

const kindStroke: Record<NodeKind, string> = {
  hub:  '#e8e6df',
  mqtt: 'oklch(0.7 0.10 222)',
  udp:  'oklch(0.7 0.10 222)',
  lora: 'oklch(0.78 0.12 70)',
};

export default function MeshDiagram(): ReactNode {
  return (
    <div className={styles.wrapper}>
      <div className={styles.frame}>
        <span className={styles.frameLabel}>FIG. 01 · MESH TOPOLOGY</span>
        <svg viewBox="0 0 520 460" className={styles.svg} aria-label="Ara mesh network diagram">
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="1" />
            </pattern>
          </defs>

          {/* grid background */}
          <rect width="520" height="460" fill="url(#grid)" />

          {/* topographic contours centred on ICP */}
          {[60, 100, 145, 192].map((r, i) => (
            <circle key={i} cx={280} cy={220} r={r}
              fill="none" stroke="rgba(232,230,223,0.04)" strokeWidth="1" />
          ))}

          {/* edges */}
          {edges.map(([a, b], i) => {
            const na = nodes[a];
            const nb = nodes[b];
            const isLora = nb.kind === 'lora';
            return (
              <line key={i}
                x1={na.cx} y1={na.cy} x2={nb.cx} y2={nb.cy}
                stroke={kindStroke[nb.kind]}
                strokeWidth="1"
                strokeDasharray={isLora ? '3 5' : undefined}
                opacity="0.5"
              />
            );
          })}

          {/* animated sync packets */}
          <circle r="2.5" fill="oklch(0.78 0.12 70)" opacity="0.9">
            <animateMotion dur="3s" repeatCount="indefinite"
              path={`M${nodes[0].cx},${nodes[0].cy} L${nodes[3].cx},${nodes[3].cy}`} />
            <animate attributeName="opacity" values="0;1;1;0" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle r="2.5" fill="oklch(0.7 0.10 222)" opacity="0.9">
            <animateMotion dur="2.2s" repeatCount="indefinite"
              path={`M${nodes[1].cx},${nodes[1].cy} L${nodes[0].cx},${nodes[0].cy}`} />
            <animate attributeName="opacity" values="0;1;1;0" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle r="2.5" fill="oklch(0.7 0.10 222)" opacity="0.9">
            <animateMotion dur="2.5s" repeatCount="indefinite" begin="0.8s"
              path={`M${nodes[0].cx},${nodes[0].cy} L${nodes[2].cx},${nodes[2].cy}`} />
            <animate attributeName="opacity" values="0;1;1;0" dur="2.5s" repeatCount="indefinite" begin="0.8s" />
          </circle>
          <circle r="2.5" fill="oklch(0.78 0.12 70)" opacity="0.9">
            <animateMotion dur="4s" repeatCount="indefinite" begin="1.5s"
              path={`M${nodes[3].cx},${nodes[3].cy} L${nodes[4].cx},${nodes[4].cy}`} />
            <animate attributeName="opacity" values="0;1;1;0" dur="4s" repeatCount="indefinite" begin="1.5s" />
          </circle>

          {/* nodes */}
          {nodes.map((n, i) => (
            <g key={i}>
              <circle cx={n.cx} cy={n.cy}
                r={n.kind === 'hub' ? 22 : 15}
                fill="#0a0c10"
                stroke={kindStroke[n.kind]}
                strokeWidth="1.2"
              />
              <text x={n.cx} y={n.cy + 1}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={n.kind === 'hub' ? '10' : '9'}
                fontWeight="600"
                fill="#e8e6df"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >{n.label}</text>
              <text x={n.cx} y={n.cy + (n.kind === 'hub' ? 38 : 30)}
                textAnchor="middle"
                fontSize="8"
                fill={kindStroke[n.kind]}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                opacity="0.8"
                letterSpacing="0.1em"
              >{n.tx}</text>
            </g>
          ))}

          {/* legend */}
          <g transform="translate(16, 426)" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="9">
            <line x1="0" y1="5" x2="18" y2="5" stroke="oklch(0.7 0.10 222)" strokeWidth="1" />
            <text x="24" y="9" fill="rgba(232,230,223,0.5)" letterSpacing="0.08em">MQTT · UDP</text>
            <line x1="110" y1="5" x2="128" y2="5" stroke="oklch(0.78 0.12 70)" strokeWidth="1" strokeDasharray="3 4" />
            <text x="134" y="9" fill="rgba(232,230,223,0.5)" letterSpacing="0.08em">LoRa</text>
          </g>
        </svg>
        <span className={styles.frameCoord}>−39.62°S · 176.84°E</span>
      </div>
    </div>
  );
}
