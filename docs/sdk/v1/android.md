---
sidebar_position: 2
---

# Android SDK Reference (v1)

This page documents the v1 API (`com.aramesh.sdk.v1`). Breaking changes will be released under `com.aramesh.sdk.v2`.

## Ara

Factory object. Loads the native libraries and opens a node.

```kotlin
object Ara {
    fun open(
        context: Context,
        path: String,
        migrations: List<Migration>,
        networkId: String = "",
        encryption: Boolean = false,
        licenseKey: String = "",
    ): Node
}
```

- `context` — Android context; used to locate bundled `.so` files
- `path` — absolute path to the SQLite file (e.g. `filesDir + "/ara.db"`)
- `migrations` — ordered list of schema migrations
- `networkId` — logical mesh identifier; only nodes with the same value exchange changesets (default: `""` syncs with all nodes)
- `encryption` — enable X25519 keypairs and AES-256-GCM message encryption (default: `false`)
- `licenseKey` — Ed25519-signed key from Ara; empty string runs in evaluation mode (10-node limit)

Throws `AraException` if the engine fails to initialise.

---

## Node

An open Ara sync node. Obtain via `Ara.open()`. Close when done — typically in
`ViewModel.onCleared()`.

```kotlin
class Node : AutoCloseable {
    val nodeId: String
    val schemaVersion: Int

    fun exec(sql: String, args: List<Any?> = emptyList())
    fun query(sql: String, args: List<Any?> = emptyList()): List<Map<String, Any?>>
    fun queryRow(sql: String, args: List<Any?> = emptyList()): Map<String, Any?>?
    fun sync()
    fun peers(): List<PeerInfo>
    fun peerGraph(): GraphData

    fun addTransportUDP(port: Int = 7946)
    fun addTransportMeshtastic(portPath: String, channel: Int = 0)
    fun addTransportMQTT(brokerUrl: String, networkId: String)
    fun initOTLP(otlpAddr: String, serviceName: String = "ara-android")

    // Blob / file transfer
    fun setBlobPolicy(dir: String, mode: Int = 0, maxBytes: Long = 0L, maxBlobSize: Long = 0L)
    fun blobIngest(path: String, mimeType: String = "application/octet-stream"): String
    fun blobPath(id: String): String

    override fun close()
}
```

### exec

Execute a write statement. Args are positional `?` parameters. Throws `Exception` on error.

```kotlin
node.exec(
    "INSERT INTO messages (id, content, created_at) VALUES (?, ?, ?)",
    listOf(UUID.randomUUID().toString(), "Hello", System.currentTimeMillis()),
)
```

### query

Execute a read query. Returns rows as `List<Map<String, Any?>>` where values are
`String`, `Long`, `Double`, or `null`.

```kotlin
val rows = node.query("SELECT * FROM messages ORDER BY created_at DESC LIMIT 50")
rows.forEach { row ->
    val id = row["id"] as? String ?: ""
    val ts = (row["created_at"] as? Number)?.toLong() ?: 0L
}
```

### queryRow

Like `query` but returns the first row as `Map<String, Any?>`, or `null` if empty.

### sync

Trigger an immediate changeset broadcast to all connected peers.

### peers

```kotlin
fun peers(): List<PeerInfo>
```

Returns all known peers with health state derived from gossip.

### peerGraph

```kotlin
fun peerGraph(): GraphData
```

Returns the mesh topology as a graph. Nodes include this device (marked `self = true`)
and all known peers. Edges are derived from gossip `via` metadata — a direct edge means
this node heard from the peer directly; an indirect edge means the peer was introduced
by a third node.

```kotlin
val graph = node.peerGraph()
graph.nodes.forEach { n -> println("${n.id} health=${n.health} self=${n.self}") }
graph.edges.forEach { e -> println("${e.source} → ${e.target} direct=${e.direct}") }
```

### addTransportMQTT

```kotlin
node.addTransportMQTT(brokerUrl = "tcp://192.168.1.100:1883", networkId = "my-network")
```

### addTransportUDP

```kotlin
node.addTransportUDP()           // default port 7946
node.addTransportUDP(port = 9000)
```

### addTransportMeshtastic

```kotlin
node.addTransportMeshtastic(portPath = "/dev/ttyUSB0", channel = 0)
```

Add a Meshtastic LoRa transport via USB serial. Requires a USB OTG cable and Meshtastic radio.

- `portPath` — serial device path (e.g. `"/dev/ttyUSB0"` or `"/dev/ttyACM0"`)
- `channel` — Meshtastic channel index (0-7, default 0)

### addTransportMQTT

```kotlin
node.addTransportMQTT(brokerUrl = "tcp://192.168.1.100:1883", networkId = "my-network")
```

### initOTLP

Send OpenTelemetry traces to a collector at `otlpAddr` (e.g. `"192.168.1.100:4317"`).

### setBlobPolicy

Configure the blob store directory and automatic sync behaviour. Must be called before
`addTransportUDP` / `addTransportMQTT`.

```kotlin
node.setBlobPolicy(
    dir = filesDir.absolutePath + "/blobs",
    mode = 2,          // 0 = none, 1 = thumbnails only, 2 = full
    maxBytes = 0L,     // total storage cap; 0 = unlimited
    maxBlobSize = 0L,  // skip individual blobs larger than this; 0 = unlimited
)
```

- **mode 0 (none)** — blobs are only stored on the node that ingested them; no automatic
  pulling from peers. Default.
- **mode 1 (thumb only)** — pull thumbnails (≤ 2 KB) from peers; skip full-size blobs.
  Suited for LoRa-constrained nodes.
- **mode 2 (full)** — pull full blob bytes from any peer that has them, via the TCP sidecar
  on UDP transport or via MQTT.

The SDK manages the blob tables (`ara_blobs`, `ara_blob_local_state`) automatically — they
do not need to appear in your migration list.

### blobIngest

Copy a local file into the blob store, record its metadata in `ara_blobs`, and mark it
locally available. Returns the SHA-256 id that can be stored in app tables.

```kotlin
val id = node.blobIngest(
    path = "/data/user/0/com.example/cache/photo.jpg",
    mimeType = "image/jpeg",
)
// Store the id as a foreign key in your own table, e.g.:
node.exec(
    "INSERT INTO messages (id, content, attachment_id) VALUES (?, ?, ?)",
    listOf(UUID.randomUUID().toString(), "See attached", id),
)
node.sync()
```

Other nodes with `mode = 2` will automatically pull the blob bytes over the TCP sidecar
after receiving the `ara_blobs` metadata via the normal CRDT changeset sync.

### blobPath

Return the local filesystem path of a stored blob, or `""` if the blob is not yet present.

```kotlin
val path = node.blobPath(id)
if (path.isNotEmpty()) {
    Glide.with(context).load(File(path)).into(imageView)
}
```

---

## Blob tables

The SDK creates and manages two internal tables on every `Ara.open`:

| Table | Synced | Purpose |
|---|---|---|
| `ara_blobs` | ✅ via CRDT | Blob metadata — id (SHA-256), mime type, size, origin node |
| `ara_blob_local_state` | ❌ local only | Per-device availability flags — `have_full`, `have_thumb` |

`ara_blobs` is a CRR (CRDT-replicated relation) so all nodes converge on the full set of
blob metadata automatically. `ara_blob_local_state` is never replicated — each node tracks
its own download state independently. This ensures a receiving node always knows it needs to
fetch a blob even if the sender already marked it locally available.

You can reference `ara_blobs.id` as a foreign key in your own tables:

```sql
CREATE TABLE messages (
    id            TEXT PRIMARY KEY,
    content       TEXT NOT NULL DEFAULT '',
    attachment_id TEXT,   -- FK → ara_blobs.id, nullable
    created_at    INTEGER NOT NULL DEFAULT 0
) STRICT;
```

---

## Migration

```kotlin
data class Migration(
    val version: Int,
    val description: String,
    val sql: String = "",
    val sync: List<String> = emptyList(),
    val alterSync: String = "",
)
```

- `sync` — table names to register as CRDTs after `sql` runs
- `alterSync` — table whose CRDT triggers to rebuild after an `ALTER TABLE`; inferred
  automatically if omitted

---

## PeerInfo

```kotlin
data class PeerInfo(
    val id: String,
    val schemaVersion: Int,
    val health: String,       // "HEALTHY" | "DEGRADED" | "ISOLATED" | "UNKNOWN"
    val transports: List<String>,
)
```

---

## GraphNode

```kotlin
data class GraphNode(
    val id: String,
    val health: String,   // "HEALTHY" | "DEGRADED" | "ISOLATED" | "UNKNOWN"
    val self: Boolean,    // true for this device
)
```

---

## GraphEdge

```kotlin
data class GraphEdge(
    val source: String,  // node UUID
    val target: String,  // node UUID
    val direct: Boolean, // false = heard via a third node
)
```

---

## GraphData

```kotlin
data class GraphData(
    val nodes: List<GraphNode> = emptyList(),
    val edges: List<GraphEdge> = emptyList(),
)
```

---

## Exception

```kotlin
class Exception(message: String) : kotlin.Exception(message)
```

Thrown by all `Node` and `Engine` methods on JNI/engine errors.
