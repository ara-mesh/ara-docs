---
sidebar_position: 2
---

# MQTT Transport

Syncs over a standard MQTT broker (e.g. Mosquitto). Suitable for WiFi or cellular
connectivity. No infrastructure limitation on bandwidth.

## Topic structure

```
ara/{network_id}/presence/{node_id}    ← retained heartbeat
ara/{network_id}/handshake/{node_id}   ← vector clock broadcast
ara/{network_id}/changeset/{node_id}   ← outbound changesets
```

All nodes on the same `network_id` automatically discover and sync with each other.

## Go

```go
node.AddTransportMQTT(ara.MQTTConfig{
    BrokerURL: "tcp://192.168.1.100:1883",
    NetworkID: "my-network",
})
```

## Android

```kotlin
node.addTransportMQTT(
    brokerUrl = "tcp://192.168.1.100:1883",
    networkId = "my-network",
)
```

## Running a broker

For development, run Mosquitto locally:

```bash
# Docker
docker run -p 1883:1883 eclipse-mosquitto

# macOS (Homebrew)
brew install mosquitto && mosquitto
```

## OpenTelemetry

When using MQTT, you can also enable trace export to an OTel collector on the same host.
The Android example app derives the collector address from the broker hostname:

```kotlin
node.initOTLP("$brokerHost:4317")
```
