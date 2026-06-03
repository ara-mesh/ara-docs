---
sidebar_position: 5
---

# Blob Transfer

Changesets carry structured rows. Binary attachments — photos, audio, documents — are too
large and too bursty to push through the CRDT changeset path, so Ara handles them with a
separate **content-addressed blob store** and a dedicated byte-transfer channel.

The split is deliberate:

- **Metadata** (`ara_blobs`) syncs as a normal CRDT relation — every node converges on the
  full catalogue of which blobs exist.
- **Bytes** transfer out-of-band, resumably, and only to nodes whose policy asks for them.

## Content addressing

A blob's id is the **SHA-256 of its contents**. That makes blobs immutable and
de-duplicated: the same file ingested on two nodes produces the same id and is stored once.
You reference the id as a foreign key from your own tables.

```go
id, err := node.IngestBlob(ctx, "/tmp/photo.jpg", "image/jpeg")
// id == "9f86d081884c7d65..." (hex SHA-256)
node.Exec(ctx, "INSERT INTO clues (id, photo_id) VALUES (?, ?)", clueID, id)
node.Sync(ctx)
```

## Lifecycle

```mermaid
sequenceDiagram
    participant App
    participant NodeA as Node A
    participant NodeB as Node B

    App->>NodeA: IngestBlob(file, mime)
    Note over NodeA: store bytes, hash → id,<br/>write ara_blobs row
    NodeA-->>App: id (SHA-256)

    NodeA->>NodeB: changeset sync (ara_blobs metadata only)
    Note over NodeB: now knows the blob exists;<br/>policy = Full and bytes missing?

    NodeB->>NodeA: fetch request (dial byte channel)
    NodeA-->>NodeB: stream bytes (resumable, offset-based)
    Note over NodeB: BlobPath(id) now returns a local path
```

1. **Ingest** — `IngestBlob` copies the file into the store, computes its id, and writes a
   row into `ara_blobs` (id, mime type, size, origin node).
2. **Metadata sync** — `ara_blobs` is a CRR, so the metadata reaches every peer through the
   normal changeset path. Peers now *know about* the blob.
3. **Byte fetch** — after merging a changeset that introduces new `ara_blobs` rows, each
   node checks its [policy](#blob-policy). If the policy wants the bytes and the node
   doesn't have them, it dials a peer that does and streams them — resuming from any partial
   download.
4. **Availability** — once the bytes land, `BlobPath(id)` returns a local filesystem path
   instead of `""`.

## API

### Configure the store

Call once, before the node starts producing or receiving blobs.

```go
node.SetBlobStore("/data/blobs", ara.BlobPolicy{
    Mode:        ara.BlobSyncFull,
    MaxBytes:    500 << 20,  // 500 MB total cap; 0 = unlimited
    MaxBlobSize: 10 << 20,   // skip blobs larger than 10 MB; 0 = unlimited
})
```

```kotlin
node.setBlobStore(
    dir = filesDir.absolutePath + "/blobs",
    policy = BlobPolicy(
        mode = BlobSyncMode.Full,   // None · ThumbOnly · Full
        maxBytes = 500L shl 20,
        maxBlobSize = 10L shl 20,
    ),
)
```

### Ingest a file

```go
id, err := node.IngestBlob(ctx, path, mimeType) // mimeType "" → application/octet-stream
```

```kotlin
val id = node.ingestBlob(path = "/sdcard/photo.jpg", mimeType = "image/jpeg")
```

### Resolve to a local path

```go
path := node.BlobPath(id) // "" if not yet present locally
if path == "" {
    // bytes haven't arrived yet — show a placeholder / pending state
}
```

```kotlin
val path = node.blobPath(id) // "" if not yet present
```

## Blob policy

The policy decides whether a node automatically pulls blob bytes after it sees the metadata.

```go
type BlobPolicy struct {
    Mode        BlobSyncMode
    MaxBytes    int64  // total store cap in bytes; 0 = unlimited
    MaxBlobSize int64  // skip individual blobs larger than this; 0 = unlimited
}

const (
    BlobSyncNone      BlobSyncMode = 0 // metadata only; never pull bytes (default)
    BlobSyncThumbOnly BlobSyncMode = 1 // pull thumbnails only (≤ 2 KB)
    BlobSyncFull      BlobSyncMode = 2 // pull full blobs when the transport allows
)
```

| Mode | Behaviour | Typical use |
|------|-----------|-------------|
| `None` (0) | Stores only what it ingests; never fetches from peers | LoRa-only field node conserving airtime |
| `ThumbOnly` (1) | Pulls thumbnails (≤ 2 KB); defers full bytes | Field node that needs previews |
| `Full` (2) | Pulls full bytes from any peer that has them | ICP / MQTT-connected node |

`MaxBytes` caps total store size; `MaxBlobSize` skips individual blobs above a threshold.
A node that skips a blob still keeps the metadata, so it can fetch the bytes later (e.g.
once on a fatter transport) by raising its policy.

## Transfer over each transport

Byte transfer adapts to the link — the metadata path is identical everywhere, only the
delivery of bytes differs.

| Transport | Byte channel | Notes |
|-----------|-------------|-------|
| UDP LAN | TCP sidecar on **port + 1** | Resumable streaming; full resolution |
| MQTT | broker | Full resolution, effectively immediate |
| Meshtastic / LoRa | chunked over the channel | **Thumbnail only** (≤ 2 KB, ~20 min); full res deferred to MQTT/WiFi |

### UDP TCP sidecar

When a blob store is configured, the UDP transport opens a TCP listener on **port + 1**
(default `7947`) alongside its UDP socket. CRDT changesets continue over UDP; this sidecar
carries blob bytes only. After a changeset merge introduces new `ara_blobs` rows the node
wants, it dials the owner's sidecar and streams them, resuming from any partial download.

The wire protocol uses a 53-byte binary header:

| Bytes | Field |
|---|---|
| 0–3 | Magic `0x41524142` ("ARAB") |
| 4 | Op: `0x01` send · `0x02` fetch-request · `0x03` fetch-response |
| 5–36 | Blob id (32 bytes, raw SHA-256) |
| 37–44 | Offset (uint64 big-endian) — resume position |
| 45–52 | Size (uint64 big-endian) — byte count following the header |

### Tiered delivery for LoRa

On a LoRa-constrained mesh, full photos are impractical (a 2 KB thumbnail alone is ~11
packets / ~20 min at the sustained budget). The pattern is:

- **Field nodes**: `BlobSyncThumbOnly` — pull the thumbnail over LoRa for a usable preview.
- **ICP / connected nodes**: `BlobSyncFull` — pull full resolution over MQTT or WiFi.

Because metadata reaches everyone, a node that only has the thumbnail can upgrade to full
resolution automatically the moment it reaches a transport that allows it. See
[LoRa transport → Attachment delivery](./transports/lora.md#attachment-delivery).

## Storage tables

| Table | Synced? | Purpose |
|-------|---------|---------|
| `ara_blobs` | ✅ via CRDT | Blob metadata — id (SHA-256), mime type, size, origin node |
| `ara_blob_local_state` | ❌ local only | Per-device availability flags — `have_full`, `have_thumb` |

The SDK manages both tables; you don't create or migrate them. `ara_blobs` is a CRR so all
nodes converge on the full set of blob metadata. `ara_blob_local_state` is **never**
replicated — each device tracks its own availability so a node can decide to fetch a blob
even if the origin already marked it locally present.

Reference `ara_blobs.id` as a foreign key from your own tables:

```sql
CREATE TABLE clues (
    id            TEXT PRIMARY KEY,
    description   TEXT NOT NULL,
    attachment_id TEXT,            -- FK → ara_blobs.id, nullable
    created_at    INTEGER NOT NULL
) STRICT;
```
