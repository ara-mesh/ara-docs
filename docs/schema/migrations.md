---
sidebar_position: 1
---

# Schema Migrations

Ara uses an **additive-only** migration system. Migrations can add tables and columns,
but never remove or rename them — this ensures all nodes can merge changesets regardless
of which migration version they're running.

## Migration struct

```go
// Go (ara-sdk-go)
type Migration struct {
    Version     int
    Description string
    SQL         string
    Sync        []string
    AlterSync   string  // auto-inferred; rarely needs to be set manually
}
```

```kotlin
// Kotlin
data class Migration(
    val version: Int,
    val description: String,
    val sql: String = "",
    val sync: List<String> = emptyList(),
    val alterSync: String = "",
)
```

## Creating a new synced table

Set `Sync` to the list of tables created by `SQL`. The runner registers CRDT tracking
on those tables after executing the SQL.

```go
Migration{
    Version:     1,
    Description: "locations table",
    SQL: `CREATE TABLE IF NOT EXISTS locations (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        lat        REAL NOT NULL,
        lon        REAL NOT NULL,
        status     TEXT NOT NULL DEFAULT 'active',
        created_at INTEGER NOT NULL
    ) STRICT;`,
    Sync: []string{"locations"},
}
```

## Adding a column to a synced table

Use a standard `ALTER TABLE` statement. The runner automatically rebuilds the CRDT
triggers for the affected table — you do not need to set `AlterSync` manually.

```go
Migration{
    Version:     2,
    Description: "add accuracy column to locations",
    SQL:         `ALTER TABLE locations ADD COLUMN accuracy_m REAL;`,
    // AlterSync is inferred as "locations" from the ALTER TABLE statement
}
```

If you need to override inference (e.g. complex multi-statement SQL), set `AlterSync`
explicitly:

```go
Migration{
    Version:   3,
    SQL:       `ALTER TABLE locations ADD COLUMN elevation_m REAL; ...`,
    AlterSync: "locations",
}
```

## Schema versioning and peers

Each node advertises its schema version in every sync handshake. Nodes refuse to merge
changesets from peers running an incompatible (higher) schema version — the older node
must migrate first.

Migration history is stored in `ara_schema_versions` (a CRDT-enabled table), so all
nodes eventually converge on the same version history.

## Example: full migration list

```go
var migrations = []ara.Migration{
    {
        Version:     1,
        Description: "locations table",
        SQL: `CREATE TABLE IF NOT EXISTS locations (
            id TEXT PRIMARY KEY, name TEXT NOT NULL,
            lat REAL NOT NULL, lon REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            created_at INTEGER NOT NULL
        ) STRICT;`,
        Sync: []string{"locations"},
    },
    {
        Version:     2,
        Description: "events table",
        SQL: `CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY, location_id TEXT,
            description TEXT NOT NULL, device_id TEXT NOT NULL,
            created_at INTEGER NOT NULL
        ) STRICT;`,
        Sync: []string{"events"},
    },
    {
        Version:     3,
        Description: "add accuracy to locations",
        SQL:         `ALTER TABLE locations ADD COLUMN accuracy_m REAL;`,
        // AlterSync inferred
    },
}
```
