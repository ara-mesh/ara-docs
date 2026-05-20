---
sidebar_position: 1
---

# Go SDK Reference (v1)

This page documents the v1 API. Breaking changes will be released under v2 with a new import path.

## Import

```go
import ara "github.com/ara-mesh/ara-go"
```

`CGO_ENABLED=1` is required at build time. No other C dependencies are needed — the engine
is bundled as a pre-built static library.

---

## ara.Open

```go
func Open(ctx context.Context, cfg Config) (*Node, error)
```

Open (or create) an Ara node backed by a SQLite database at `cfg.Path`. Runs all pending
migrations, initialises the CRDT engine, starts the background sync loop, and returns a
ready node. There is no separate `Run` call.

---

## ara.Config

```go
type Config struct {
    Path         string        // SQLite file path; use ":memory:" for tests
    Migrations   []Migration   // ordered schema migrations
    NetworkID    string        // logical mesh identifier; only matching nodes sync (default: "" = all)
    Encryption   bool          // enable X25519 keypairs + AES-256-GCM on all messages (default: false)
    SyncInterval time.Duration // periodic handshake interval; 0 = default 30s; increase for LoRa nodes
    OTLPAddr        string        // optional OTLP gRPC endpoint, e.g. "localhost:4317"
    OTLPServiceName string        // optional OTel service name; defaults to "ara-go"
    LicenseKey      string        // Ed25519-signed key from Ara; empty = 10-node evaluation limit
}
```

`SyncInterval` tuning guide:
- **WiFi / LAN / MQTT**: use default (30s) or lower (10s) for faster convergence
- **LoRa-only nodes**: use 60–120s to stay within the 1% duty cycle budget (~110 bytes/min sustained at SF10 915 MHz; single-packet latency is ~20s)

---

## ara.Migration

```go
type Migration struct {
    Version     int
    Description string
    SQL         string   // DDL to execute (CREATE TABLE, ALTER TABLE, etc.)
    Sync        []string // tables to register as CRDTs after SQL runs
    AlterSync   string   // override table for ALTER; inferred automatically from SQL
}
```

Migrations are applied in `Version` order. They are additive-only — never drop or rename
columns or tables that are registered for sync.

When adding a column to an existing synced table, the runner infers the target table from
the `ALTER TABLE` statement automatically and rebuilds the CRDT triggers — no extra fields needed:

```go
{
    Version:     2,
    Description: "add edited_at to messages",
    SQL:         `ALTER TABLE messages ADD COLUMN edited_at INTEGER NOT NULL DEFAULT 0;`,
    // AlterSync is inferred as "messages" from the ALTER TABLE statement
}
```

Set `AlterSync` explicitly only when inference would be ambiguous (e.g. multi-statement SQL
where the first statement is not the `ALTER TABLE`).

---

## ara.Node

### Close

```go
err := node.Close()
```

Stop the sync loop and close the database.

### Exec

```go
err := node.Exec(ctx, "INSERT INTO messages (id, content) VALUES (?, ?)", "id-1", "hello")
```

Execute a write statement. Args are positional `?` bind parameters.

### Query

```go
rows, err := node.Query(ctx, "SELECT id, content FROM messages WHERE id = ?", "id-1")
for _, row := range rows {
    fmt.Println(row["id"], row["content"])
}
```

Returns all rows as `[]map[string]any`. JSON numbers come back as `float64`; use
[`Row.Get`](#rowget) for typed access to individual values.

### QueryRow

```go
row := node.QueryRow(ctx, "SELECT COUNT(*) AS n FROM messages")
var count int
err := row.Get("n", &count)
```

Returns a `*Row`. If no rows matched, `row.Err()` returns `ErrNoRows`.

### Sync

```go
err := node.Sync(ctx)
```

Trigger an immediate changeset broadcast to all connected peers. The background loop also
syncs automatically; this is for on-demand flush.

### NodeID

```go
id := node.NodeID() // UUID string, e.g. "6ff234d2-..."
```

### SchemaVersion

```go
v := node.SchemaVersion() // highest applied migration version
```

### Peers

```go
peers, err := node.Peers(ctx) // []PeerInfo
```

### AddTransportUDP

```go
err := node.AddTransportUDP(port int, seeds ...string)
```

Add a UDP LAN transport. `seeds` is an optional list of `"host:port"` peer addresses.
Seeds are required on macOS when running multiple nodes on the same machine because
broadcast does not loop back on the loopback interface.

```go
// Single node, no seeds needed (LAN broadcast discovers peers)
node.AddTransportUDP(7946)

// Multiple nodes on localhost
node.AddTransportUDP(7946, "127.0.0.1:7947", "127.0.0.1:7948")
```

### AddTransportMeshtastic

```go
err := node.AddTransportMeshtastic(portPath string, channel int)
```

Add a Meshtastic LoRa transport via USB serial.

- `portPath` — serial device path (e.g. `"/dev/ttyUSB0"` or `"/dev/ttyACM0"`)
- `channel` — Meshtastic channel index (0-7, default 0)

```go
node.AddTransportMeshtastic("/dev/ttyUSB0", 0)
```

### AddTransportMQTT

```go
err := node.AddTransportMQTT(ara.MQTTConfig{
    BrokerURL: "tcp://192.168.1.1:1883",
    NetworkID: "my-mesh",
})
```

Add an MQTT transport. All nodes sharing the same `NetworkID` form a mesh over the broker.

### SetBlobStore

```go
err := node.SetBlobStore(dir string, policy BlobPolicy)
```

Configure a local content-addressed blob store at `dir` with an automatic sync policy.
Call before the node begins ingesting or receiving blobs.

```go
node.SetBlobStore("/data/blobs", ara.BlobPolicy{
    Mode:        ara.BlobSyncFull,  // BlobSyncNone | BlobSyncThumbOnly | BlobSyncFull
    MaxBytes:    500 << 20,         // 500 MB total cap; 0 = unlimited
    MaxBlobSize: 10 << 20,          // skip blobs > 10 MB; 0 = unlimited
})
```

### IngestBlob

```go
id, err := node.IngestBlob(ctx, path, mimeType string) (string, error)
```

Copy a local file into the blob store and return its SHA-256 content id. Store the id as a
foreign key in an app table to associate the blob with a record.

```go
id, err := node.IngestBlob(ctx, "/tmp/photo.jpg", "image/jpeg")
if err != nil { ... }
node.Exec(ctx, "INSERT INTO clues (id, photo_id) VALUES (?, ?)", clueID, id)
node.Sync(ctx)
```

Peers with `BlobSyncFull` policy will automatically pull the bytes after receiving the blob
metadata through normal changeset sync.

### BlobPath

```go
path := node.BlobPath(id) // filesystem path, or "" if not yet present locally
```

---

## ara.Row

`QueryRow` returns `*Row`. Read columns by name with `Get`, or retrieve the full map.

### Row.Get

```go
func (r *Row) Get(col string, dest any) error
```

Read a named column into `dest`. Supported destination types: `*string`, `*int`, `*int64`,
`*float64`, `*bool`, `*[]byte`, `*any`.

```go
var count int
if err := row.Get("n", &count); err != nil { ... }
```

### Row.Map

```go
m, err := row.Map() // map[string]any
```

### Row.Err

```go
err := row.Err() // non-nil if no rows matched (ErrNoRows) or a query error occurred
```

---

## ara.BlobPolicy

```go
type BlobPolicy struct {
    Mode        BlobSyncMode
    MaxBytes    int64  // total storage cap in bytes; 0 = unlimited
    MaxBlobSize int64  // skip individual blobs larger than this; 0 = unlimited
}

const (
    BlobSyncNone      BlobSyncMode = 0 // metadata only; never pull bytes (default)
    BlobSyncThumbOnly BlobSyncMode = 1 // pull thumbnails only (≤ 2 KB)
    BlobSyncFull      BlobSyncMode = 2 // pull full blobs when transport allows
)
```

---

## ara.MQTTConfig

```go
type MQTTConfig struct {
    BrokerURL string // e.g. "tcp://192.168.1.1:1883"
    NetworkID string // shared identifier for topic isolation
}
```

---

## ara.PeerInfo

```go
type PeerInfo struct {
    ID            string
    SchemaVersion int
    Health        string   // "HEALTHY" | "DEGRADED" | "ISOLATED" | "UNKNOWN"
    Transports    []string
}
```

---

## ErrNoRows

```go
var ErrNoRows = errors.New("ara: no rows in result")
```

Returned by `Row.Err()` when a `QueryRow` matched no rows.
