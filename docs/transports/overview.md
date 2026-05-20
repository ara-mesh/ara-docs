---
sidebar_position: 1
---

# Transport Overview

Ara decouples sync logic from the physical link. Any type implementing the `Transport`
interface can carry changesets between nodes.

## Available transports

| Transport | Range | Latency | Sustained budget | Burst throughput | Infrastructure |
|-----------|-------|---------|-----------------|------------------|----------------|
| UDP LAN | local subnet | < 1s | unlimited | unlimited | none |
| Meshtastic | 5–15km LoRa | ~10–20s (single packet) | **~110 B/min** | **~4,600 B/min** | USB serial |
| MQTT | anywhere (WiFi/cellular) | < 1s | unlimited | unlimited | broker |

Meshtastic figures measured on NZ 915 MHz hardware (SF10, 1% duty cycle). The **~110 B/min**
figure is the *sustained* duty-cycle budget; single bursts can reach **~4,600 B/min** before
firmware throttling. See [LoRa transport](./lora.md) for full benchmark results.

## Priority order

When multiple transports are registered, the engine tries them highest-priority first:

1. **MQTT / WiFi** — unconstrained bandwidth, requires broker
2. **UDP / LAN** — unconstrained, no infrastructure, subnet only
3. **LoRa / Meshtastic** — 5–15km range, ~10–20s packet latency, **~110 bytes/min sustained**
   (single bursts up to **~4,600 bytes/min** before firmware throttling, 915 MHz SF10)

Changesets arriving on multiple transports are idempotent — deduplication is handled
by the engine.

## Adding transports

### Go

```go
node.AddTransportUDP(7946)
node.AddTransportMeshtastic("/dev/ttyUSB0", 0)
node.AddTransportMQTT(ara.MQTTConfig{BrokerURL: "tcp://192.168.1.100:1883", NetworkID: "my-mesh"})
```

### Android (Kotlin)

```kotlin
node.addTransportUDP()
node.addTransportMeshtastic(portPath = "/dev/ttyUSB0", channel = 0)
node.addTransportMQTT(brokerUrl = "tcp://192.168.1.100:1883", networkId = "my-network")
```
