import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  icon: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Conflict-Free Sync',
    icon: '🔄',
    description: (
      <>
        Powered by a CRDT merge engine. Every node can write independently — changes
        merge automatically without conflicts when connectivity is restored.
      </>
    ),
  },
  {
    title: 'Transport-Agnostic',
    icon: '📡',
    description: (
      <>
        Sync over Internet, Network, or Radio mesh. The engine selects
        the best available transport and falls back gracefully when links drop.
      </>
    ),
  },
  {
    title: 'Android + Go SDK',
    icon: '📱',
    description: (
      <>
        A Go engine compiled to a native Android library (.so) via CGO. Kotlin
        API wraps JNI — one <code>Engine.open()</code> call gets you a syncing node.
      </>
    ),
  },
];

function Feature({title, icon, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md">
        <div className={styles.featureIcon}>{icon}</div>
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

type TransportRow = {
  name: string;
  range: string;
  bandwidth: string;
  infrastructure: string;
};

const transports: TransportRow[] = [
  {name: 'MQTT/WiFi', range: 'Internet', bandwidth: 'Unconstrained', infrastructure: 'MQTT broker'},
  {name: 'UDP LAN', range: 'Local Network', bandwidth: 'Unconstrained', infrastructure: 'None'},
  {name: 'LoRa', range: '5–15km', bandwidth: '~110 bytes/min', infrastructure: 'None'},
];

function TransportTable() {
  return (
    <div className={styles.transportTable}>
      <table>
        <thead>
          <tr>
            <th>Transport</th>
            <th>Range</th>
            <th>Bandwidth</th>
            <th>Infrastructure</th>
          </tr>
        </thead>
        <tbody>
          {transports.map((t) => (
            <tr key={t.name}>
              <td><strong>{t.name}</strong></td>
              <td>{t.range}</td>
              <td>{t.bandwidth}</td>
              <td>{t.infrastructure}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <>
      <section className={styles.features}>
        <div className="container">
          <div className="row">
            {FeatureList.map((props, idx) => (
              <Feature key={idx} {...props} />
            ))}
          </div>
        </div>
      </section>
      <section className={styles.transports}>
        <div className="container">
          <Heading as="h2" className="text--center">Transport Overview</Heading>
          <TransportTable />
        </div>
      </section>
    </>
  );
}
