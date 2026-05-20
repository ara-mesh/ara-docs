---
sidebar_position: 1
---

# Go Setup

## Prerequisites

- Go 1.22+
- gcc (`CGO_ENABLED=1` is required)

The CRDT extension and engine are bundled per platform — no separate downloads needed.

## Install

```bash
go get github.com/ara-mesh/ara-go
```

## Quick start

```go
package main

import (
    "context"
    "log"

    ara "github.com/ara-mesh/ara-go"
)

var migrations = []ara.Migration{
    {
        Version:     1,
        Description: "messages table",
        SQL: `CREATE TABLE IF NOT EXISTS messages (
            id         TEXT PRIMARY KEY,
            content    TEXT NOT NULL DEFAULT '',
            created_at INTEGER NOT NULL DEFAULT 0
        ) STRICT;`,
        Sync: []string{"messages"},
    },
}

func main() {
    ctx := context.Background()

    node, err := ara.Open(ctx, ara.Config{
        Path:       "./ara.db",
        Migrations: migrations,
    })
    if err != nil {
        log.Fatal(err)
    }
    defer node.Close()

    // Add a UDP transport. Pass Seeds with explicit peer addresses when running
    // multiple nodes on the same machine (macOS broadcast doesn't loop back).
    node.AddTransportUDP(7946, "192.168.1.2:7946")

    // Write
    err = node.Exec(ctx,
        "INSERT INTO messages (id, content, created_at) VALUES (?, ?, ?)",
        "msg-1", "Hello mesh", 1000,
    )
    if err != nil {
        log.Fatal(err)
    }

    // Read
    rows, err := node.Query(ctx, "SELECT id, content FROM messages")
    if err != nil {
        log.Fatal(err)
    }
    for _, row := range rows {
        log.Printf("%s: %s", row["id"], row["content"])
    }
}
```

## Build

```bash
CGO_ENABLED=1 go build ./...
```

## Test

```bash
CGO_ENABLED=1 go test ./...
```
