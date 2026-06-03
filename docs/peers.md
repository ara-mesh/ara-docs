---
sidebar_position: 3
---

# Peers

A *peer* is another Ara node this node can sync with. Ara has no central registry and no
explicit "connect to peer" call — peers are **discovered automatically** over whatever
transports you add. This page covers how peers are found, how to add them when discovery
isn't automatic, and the APIs for inspecting them.

## How peers are discovered

Discovery depends on the transport:

| Transport | Discovery mechanism |
|-----------|--------------------|
| UDP LAN | Broadcasts a presence frame to `255.255.255.255` every 10s; any node on the subnet that hears it becomes a peer (TTL 90s) |
| MQTT | All nodes sharing a `NetworkID` see each other via retained presence messages on the broker |
| Meshtastic | Peers are learned from changesets and gossip received over the LoRa channel |

Once any two nodes share a transport and a `NetworkID`, they handshake, exchange vector
clocks, and begin delta sync — no further wiring required.

## Adding a peer

You don't add peers individually; you add a **transport**, and peers reachable over it
appear on their own. See [Transports](./transports/overview.md) for the full reference.

```go
// Any node reachable on the LAN subnet becomes a peer
node.AddTransportUDP(7946)

// Any node on the same broker + NetworkID becomes a peer
node.AddTransportMQTT(ara.MQTTConfig{
    BrokerURL: "tcp://192.168.1.100:1883",
    NetworkID: "my-mesh",
})

// Any node on the same LoRa channel becomes a peer
node.AddTransportMeshtastic("/dev/ttyUSB0", 0)
```

```kotlin
node.addTransportUDP()
node.addTransportMQTT(brokerUrl = "tcp://192.168.1.100:1883", networkId = "my-mesh")
node.addTransportMeshtastic(portPath = "/dev/ttyUSB0", channel = 0)
```

### Explicit peers (UDP seeds)

LAN broadcast doesn't always reach a peer — it doesn't loop back on the loopback
interface, and it's often filtered across subnets or by VPNs. In those cases, name the
peer's `host:port` explicitly as a **seed**:

```go
// Two nodes on localhost (broadcast won't loop back)
node.AddTransportUDP(17946, "127.0.0.1:17947")

// A peer on another subnet
node.AddTransportUDP(7946, "10.0.5.12:7946")
```

The heartbeat loop unicasts a presence frame to each seed in addition to broadcasting, so
the peer is discovered even when broadcast is unavailable. Seeds are additive — broadcast
discovery still runs alongside them. You only need to seed **one direction**; once the
seeded node hears a presence frame back, the link is bidirectional.

Seeds are only relevant to UDP. MQTT and Meshtastic peers are discovered through the
broker and the LoRa channel respectively.

## Inspecting peers

### Peers

```go
peers, err := node.Peers(ctx) // []PeerInfo
for _, p := range peers {
    fmt.Printf("%s  schema=%d  health=%s  via=%v\n",
        p.ID, p.SchemaVersion, p.Health, p.Transports)
}
```

```kotlin
node.peers().forEach { p ->
    Log.d("ara", "${p.id} health=${p.health} via=${p.transports}")
}
```

`PeerInfo` reports the peer's id, its highest applied schema version, the transports it has
been heard on, and a health state:

```go
type PeerInfo struct {
    ID            string
    SchemaVersion int
    Health        string   // "HEALTHY" | "DEGRADED" | "ISOLATED" | "UNKNOWN"
    Transports    []string
}
```

### Health states

Health is derived from how recently the peer was last heard from, relative to the expected
heartbeat cadence:

| State | Meaning |
|-------|---------|
| `HEALTHY` | Heard from within the expected window; syncing normally |
| `DEGRADED` | Overdue but not yet timed out — link is slow or lossy |
| `ISOLATED` | Not heard from for well beyond the timeout; presumed unreachable |
| `UNKNOWN` | Insufficient history to classify (just discovered, or just started) |

### Peer graph (Android)

The Android SDK additionally exposes the mesh topology, including peers learned
*indirectly* through gossip:

```kotlin
val graph = node.peerGraph()
graph.nodes.forEach { n -> /* n.id, n.health, n.self */ }
graph.edges.forEach { e -> /* e.source → e.target, e.direct */ }
```

A **direct** edge means this node heard from the peer itself; an **indirect** edge means
the peer was introduced by a third node's gossip. This is what drives the node-health map
in the ICP dashboard.

## Schema compatibility

Two nodes only merge changesets when their schema versions are compatible. The schema
version is advertised in every handshake; a node refuses changesets from a peer on an
incompatible version rather than corrupting local state. Keep migrations additive so older
peers stay mergeable — see [Schema Migrations](./schema/migrations.md).
