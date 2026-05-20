---
sidebar_position: 4
---

# Meshtastic Transport

Meshtastic LoRa provides 5–15km range with no infrastructure. Ara connects to
Meshtastic devices via USB serial using the Meshtastic protobuf API (Apache 2.0).

## Prerequisites

- USB OTG cable (Android device → Meshtastic radio)
- Meshtastic radio with standard firmware flashed
- `usb-serial-for-android` library

```kotlin
// build.gradle
dependencies {
    implementation("com.github.mik3y:usb-serial-for-android:3.6.0")
}
```

## Finding the serial port

Discover available USB serial devices:

```kotlin
import com.hoho.android.usbserial.driver.UsbSerialProber

val manager = getSystemService(Context.USB_SERVICE) as UsbManager
val drivers = UsbSerialProber.getDefaultProber().findAllDrivers(manager)

// Filter for Meshtastic devices (VID/PID varies)
// Common: 0x1a86 (CH340), 0x10c4 (CP2102), 0x0403 (FTDI)
val meshtasticDriver = drivers.firstOrNull { driver ->
    val device = driver.device
    device.vendorId == 0x1a86 || device.vendorId == 0x10c4 || device.vendorId == 0x0403
}

if (meshtasticDriver == null) {
    return  // No Meshtastic device found
}

// Get device path
val devicePath = meshtasticDriver.device.deviceName
```

## Android

```kotlin
node.addTransportMeshtastic(portPath = devicePath, channel = 0)
```

| Parameter | Description |
|-----------|------------|
| `portPath` | USB device path from discovery |
| `channel` | Meshtastic channel index (0-7, default 0) |

## Go

```go
node.AddTransportMeshtastic("/dev/ttyUSB0", 0)
```

## Measured performance

Figures measured on NZ 915 MHz hardware (two physical Meshtastic devices, SF10, 1% duty cycle).

| Scenario | Measured latency | Throughput |
|---|---|---|
| Single small changeset (1 row, 1 non-PK col) | ~10–20s end-to-end | — |
| **Burst** (5 rows, 10 changes, ~1.9 KB wire) | **~25s end-to-end** | **~4,600 bytes/min** |
| Sustained (1 row/min, steady state) | ~70–80s per delivery | ~110 bytes/min |

Burst throughput is **~40× the sustained budget** because Meshtastic firmware allows short
transmit bursts before duty-cycle throttling kicks in. Repeated bursts at this rate trigger
`MAX_RETRANSMIT` / `DUTY_CYCLE_LIMIT` errors and convergence degrades.

## Constraints

The figures below are for 915 MHz at 1% duty cycle (SF10), a common LoRa configuration.
Actual throughput depends on your regional band, spreading factor, and duty cycle limit.

| Parameter | Value |
|---|---|
| Meshtastic packet payload | 220 bytes |
| Ara chunk payload | 188 bytes (192 byte budget − 4 byte chunk header) |
| Duty cycle | 1% (region-dependent) |
| **Sustained throughput budget** | **~110 bytes/minute per node** |
| **Burst throughput (observed)** | **~4,000–5,000 bytes/minute** |

The **~110 bytes/min** figure is a **sustained average**, not a hard burst cap. A single
~1.9 KB burst completes in ~25 s; sending at that rate continuously would exhaust the budget
and trigger firmware throttling. For steady-state operation, size changesets to stay within
~110 bytes/minute averaged over time.

## Capacity planning

LoRa capacity is shared across all nodes on the same channel. Use this table to estimate
channel utilisation as your node count grows:

| Nodes | Estimated utilisation |
|---|---|
| 6 | ~46% |
| 12 | ~92% |
| 20+ | >100% — segment across channels |

When utilisation exceeds 100%, changesets queue and convergence time degrades. Split large
meshes across multiple LoRa channels with MQTT bridging between segments.

## Chunking

Changesets exceeding 188 bytes are split into chunks with sequence numbers.
Chunking is handled in the Meshtastic transport, not the sync engine.

```
Chunk header (4 bytes): [chunk_id:1][seq:1][total:1][reserved:1]
Payload per chunk: up to 188 bytes
```

## CRDT change count

The CRDT engine tracks **one change per non-PK column per row**, not one change per row.
A table with 2 non-PK columns produces 2 changes per insert. Factor this into changeset
size estimates: a 5-row insert into a 2-column table produces ~10 changes.

## Attachment delivery

| Content | Transport |
|---|---|
| Thumbnail (≤ 2 KB) | LoRa — ~11 packets, ~20 min |
| Full resolution | MQTT / WiFi only |


