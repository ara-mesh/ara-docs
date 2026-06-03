---
sidebar_position: 1
---

# What is Ara?

Ara is a delay-tolerant, offline-first mesh sync SDK for any application that needs
shared state without reliable connectivity. It provides conflict-free, eventually-consistent
state across nodes communicating over heterogeneous transports — UDP LAN, LoRa mesh, and
MQTT — with graceful degradation when links go down.

## How it works

```
┌─────────────────────────────────────────────────────────────┐
│                        Application                           │
│              (UI / dashboard / Android / Go)                 │
├─────────────────────────────────────────────────────────────┤
│                       Ara SDK                                │
│         Open · Exec · Query · Peers · IngestBlob            │
├───────────────────────┬─────────────────────────────────────┤
│    Sync Engine        │        Blob Store                    │
│  handshake → delta   │  content-addressed (SHA-256)        │
│  send → merge         │  resumable transfer                  │
├───────────────────────┴─────────────────────────────────────┤
│                  Transport Manager                           │
│          priority fallback · dedup · payload limit            │
├──────────────┬──────────────────┬───────────────────────────┤
│  UDP LAN     │   LoRa / Meshtastic │   MQTT                 │
│              │   220 B packets     │   WiFi/cellular        │
├──────────────┴──────────────────┴───────────────────────────┤
│                     CRDT merge engine                         │
│        Last-Writer-Wins per column · vector clock delta        │
├─────────────────────────────────────────────────────────────┤
│                    SQLite (local store)                      │
└─────────────────────────────────────────────────────────────┘
```

### Key properties

- **Offline-first** — every node has a full local copy; reads and writes work without network
- **CRDT merge** — conflicts resolve automatically via Last-Writer-Wins per column
- **Vector clock delta sync** — only changes the peer is missing are transmitted
- **Schema migrations** — additive-only, version negotiated on peer handshake
- **Transport-agnostic** — pluggable transports; engine degrades to best available link
- **Blob transfer** — content-addressed store with resumable byte delivery via a TCP sidecar alongside UDP sync

## Next steps

- [Go Setup](./setup/go.md) — prerequisites and quick start for Go developers
- [Android Setup](./setup/android.md) — add Ara to an Android app
- [SDK Reference](./sdk/v1/go.md) — full Go API reference
- [Peers](./peers.md) — how nodes discover and connect to each other
- [Transports](./transports/overview.md) — configure UDP or LoRa
- [Blob Transfer](./blobs.md) — attach and replicate photos and files
