import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import MeshDiagram from '@site/src/components/MeshDiagram';

import styles from './index.module.css';

const features = [
  {
    num: 'F-01',
    title: 'CRDT merge',
    body: 'Vector-clock delta sync. Conflicts resolve deterministically — no merge handlers in your application code.',
  },
  {
    num: 'F-02',
    title: 'Plain SQL',
    body: 'SQLite is the source of truth. Ara instruments tracked tables via virtual tables; your schema and queries are unchanged.',
  },
  {
    num: 'F-03',
    title: 'Multi-transport',
    body: 'Network, Internet, and Radio attach as siblings. The engine syncs over every available link and deduplicates changesets.',
  },
  {
    num: 'F-04',
    title: 'Schema versioning',
    body: 'Additive migrations, version negotiated on handshake. Older nodes keep working until you choose to upgrade.',
  },
  {
    num: 'F-05',
    title: 'Delay-tolerant',
    body: 'Hours or days offline. State converges when any link comes back — no replay coordination, no manual reconciliation.',
  },
  {
    num: 'F-06',
    title: 'Observable',
    body: 'OpenTelemetry traces on every sync operation. Drop a collector at the Incident Command Post; see the whole mesh.',
  },
];

const transports = [
  {
    tag: 'Network',
    name: 'UDP',
    lede: 'Works on any subnet. No infrastructure required — nodes discover each other via broadcast.',
    rows: [
      ['Range', 'Network'],
      ['Bandwidth', 'Unconstrained'],
      ['Infrastructure', 'None'],
      ['Latency', '< 1 s'],
    ],
  },
  {
    tag: 'Internet',
    name: 'MQTT',
    lede: 'Works wherever a broker is reachable — LAN, cell, or Starlink at the ICP.',
    rows: [
      ['Range', 'Internet'],
      ['Bandwidth', 'Unconstrained'],
      ['Infrastructure', 'MQTT broker'],
      ['Latency', '< 1 s'],
    ],
  },
  {
    tag: 'Radio',
    name: 'LoRa',
    lede: 'Works when neither Network nor Internet does. 5–15 km, no infrastructure, sub-watt power. Actual bandwidth depends on your regional band and duty-cycle limit.',
    rows: [
      ['Range', '5 – 15 km'],
      ['Bandwidth', '~110 B/min – 5 KB/min*'],
      ['Infrastructure', 'None'],
      ['Latency', '~20 s per packet'],
    ],
  },
];

function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroGrid} />
      <div className={styles.heroInner}>
        <div className={styles.heroText}>
          <div className={styles.heroSpec}>SDK · NETWORK · INTERNET · RADIO · v1.0</div>
          <h1 className={styles.heroTitle}>
            Sync that holds{' '}
            <em className={styles.heroTitleAccent}>when the network doesn't.</em>
          </h1>
          <p className={styles.heroSubtitle}>
            Ara is the SQLite sync engine for field operations — Search &amp; Rescue,
            expeditions, disaster response. Write to a local database. State converges
            across the team over Internet, Network, or Radio, whatever link is up.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.btnPrimary} to="/docs/setup/go">
              READ THE GO QUICKSTART →
            </Link>
            <Link className={styles.btnSecondary} to="https://github.com/ara-mesh">
              VIEW ON GITHUB
            </Link>
          </div>
          <div className={styles.heroEtymology}>
            <strong>ara</strong> · a path, route, way through.
            <br />Built in Aotearoa New Zealand.
          </div>
        </div>
        <div className={styles.heroVisual}>
          <MeshDiagram />
        </div>
      </div>
    </section>
  );
}

function StatsBar() {
  return (
    <div className={styles.statsBar}>
      <div className={styles.statsInner}>
        {[
          {label: 'SYNC LATENCY',      value: '< 1 s',      sub: 'over WiFi / MQTT'},
          {label: 'LORA RANGE',        value: '5–15 km',    sub: 'no infrastructure'},
          {label: 'OFFLINE TOLERANCE', value: '∞',          sub: 'days, weeks, indefinite'},
          {label: 'LORA THROUGHPUT',   value: '~5 KB/min*', sub: 'burst; sustained ~110 B/min, varies by region'},
        ].map((s, i) => (
          <div key={i} className={styles.stat}>
            <span className={styles.statLabel}>{s.label}</span>
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statSub}>{s.sub}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Features() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionLabel}>§ 01 · CAPABILITIES</div>
          <div>
            <h2 className={styles.sectionTitle}>What's in the box.</h2>
            <p className={styles.sectionSubtitle}>
              Six properties that distinguish Ara from a sync queue or a centralised
              backend. None of these require code in your application — they are
              properties of the engine.
            </p>
          </div>
        </div>
        <div className={styles.featuresGrid}>
          {features.map((f, i) => (
            <div key={i} className={styles.featureCard}>
              <div className={styles.featureNum}>{f.num}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CodeExample() {
  return (
    <section className={`${styles.section} ${styles.sectionDark}`}>
      <div className={styles.container}>
        <div className={styles.codeSection}>
          <div className={styles.codeTextBlock}>
            <div className={styles.sectionLabel}>§ 02 · INTERFACE</div>
            <h2 className={styles.sectionTitle} style={{color: '#f6f3ec'}}>
              Three calls. One database.
            </h2>
            <p className={styles.sectionSubtitle} style={{color: 'rgba(232,230,223,0.7)'}}>
              Open a node, attach a transport, run SQL. No new query language, no merge
              handlers, no peer discovery code. The rest is the engine's problem.
            </p>
            <Link className={styles.btnPrimary} to="/docs/setup/go">
              Go quickstart →
            </Link>
          </div>
          <div className={styles.codeBlock}>
            <div className={styles.codeHeader}>
              <span className={styles.codeFileName}>main.go</span>
              <span className={styles.codeHeaderRight}>go run · CGO_ENABLED=1</span>
            </div>
            <pre className={styles.codeBody}><code>{`node, _ := ara.Open(ctx, ara.Config{
    Path: "./ara.db",
    Migrations: []ara.Migration{{
        Version: 1,
        SQL: \`CREATE TABLE positions (
            id          TEXT PRIMARY KEY,
            device_id   TEXT NOT NULL,
            lat         REAL NOT NULL,
            lon         REAL NOT NULL,
            recorded_at INTEGER NOT NULL
        ) STRICT;\`,
        Sync: []string{"positions"},
    }},
})
defer node.Close()

// attach a transport — sync starts immediately
node.AddTransportUDP(7946)

// write — propagates to every peer automatically
node.Exec(ctx,
    "INSERT INTO positions (id, device_id, lat, lon, recorded_at) VALUES (?,?,?,?,?)",
    "pos-1", "unit-42", 37.7749, -122.4194, time.Now().UnixMilli(),
)

// read locally — always available, even offline
rows, _ := node.Query(ctx,
    "SELECT device_id, lat, lon FROM positions ORDER BY recorded_at DESC",
)`}</code></pre>
          </div>
        </div>
      </div>
    </section>
  );
}

function Transports() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionLabel}>§ 03 · TRANSPORTS</div>
          <div>
            <h2 className={styles.sectionTitle}>A reach ladder.</h2>
            <p className={styles.sectionSubtitle}>
              Attach any combination to a single node. The engine syncs over all
              available links simultaneously and deduplicates changesets.
              Network when you have a subnet. Internet when you have a broker.
              Radio when you have neither.
            </p>
          </div>
        </div>
        <div className={styles.transportGrid}>
          {transports.map((t, i) => (
            <div key={i} className={styles.transportCard}>
              <div className={styles.transportTag}>{t.tag}</div>
              <div className={styles.transportName}>{t.name}</div>
              <p className={styles.transportLede}>{t.lede}</p>
              <ul className={styles.transportMeta}>
                {t.rows.map(([k, v], j) => (
                  <li key={j}>
                    <span>{k}</span>
                    <strong>{v}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className={styles.ctaSection}>
      <div className={styles.container}>
        <h2 className={styles.ctaTitle}>Ready to go offline?</h2>
        <p className={styles.ctaSubtitle}>
          Read the Go quickstart to get a node syncing in minutes.
        </p>
        <div className={styles.ctaActions}>
          <Link className={styles.ctaBtnPrimary} to="/docs/setup/go">
            Go quickstart →
          </Link>
          <Link className={styles.ctaBtnOutline} to="https://github.com/ara-mesh">
            GitHub ↗
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="Ara — Offline-first mesh sync"
      description="CRDT-powered SQLite sync over MQTT, UDP, and LoRa. Built for field operations.">
      <Hero />
      <StatsBar />
      <Features />
      <CodeExample />
      <Transports />
      <CTA />
    </Layout>
  );
}
