---
sidebar_position: 3
---

# UDP Transport

Syncs over LAN UDP without any broker or infrastructure. Suitable for devices on the
same subnet (WiFi LAN, ad-hoc hotspot).

## Peer discovery

On start, each node binds to the configured port and begins broadcasting a compact
**presence frame** to `255.255.255.255` every 10 seconds. Any node that receives a
presence frame records the sender's address and considers it a live peer (TTL 90s).

## Frame format

| Frame | Byte 0 | Bytes 1–16 | Bytes 17–18 |
|---|---|---|---|
| Presence | `0x01` | NodeID (16 bytes) | Port (big-endian uint16) |
| Data | `0x02` | NodeID (16 bytes) | Payload |

## Go

```go
node.AddTransportUDP(7946) // default port; bind and broadcast
```

## Android

```kotlin
node.addTransportUDP()           // default port 7946
node.addTransportUDP(port = 9000)
```

## Seeds (explicit peers)

LAN broadcast does not loop back on loopback interfaces. For **localhost testing** or
environments where broadcast is filtered, specify seed addresses explicitly:

```go
node.AddTransportUDP(17946, "127.0.0.1:17947")
```

The heartbeat loop unicasts a presence frame to each seed address in addition to the
broadcast, ensuring discovery even when broadcast is unavailable.

## Blob transfer (TCP sidecar)

When a blob store is configured (`node.SetBlobStore` / `node.setBlobPolicy`), the UDP
transport opens a TCP listener on **port + 1** (default `7947`) alongside the UDP socket.
This sidecar is used exclusively for blob byte transfer — CRDT changesets continue over UDP.

Blob transfer is triggered automatically after each changeset merge: if the received
changesets include new `ara_blobs` metadata rows that the local node does not yet have,
the SDK dials the owner's TCP sidecar and streams the bytes, resuming from any partial
download.

The TCP wire protocol uses a 53-byte binary header:

| Bytes | Field |
|---|---|
| 0–3 | Magic `0x41524142` ("ARAB") |
| 4 | Op: `0x01` = send, `0x02` = fetch-request, `0x03` = fetch-response |
| 5–36 | Blob id (32 bytes, raw SHA-256) |
| 37–44 | Offset (uint64 big-endian) — resume position |
| 45–52 | Size (uint64 big-endian) — byte count following the header |

## Permissions (Android)

```xml
<uses-permission android:name="android.permission.CHANGE_WIFI_MULTICAST_STATE" />
```

Some Android devices suppress multicast/broadcast by default. Acquire a `MulticastLock`
before starting UDP:

```kotlin
val wifiManager = context.getSystemService(WifiManager::class.java)
val lock = wifiManager.createMulticastLock("ara-udp")
lock.acquire()
// ... start node ...
// lock.release() when done
```
