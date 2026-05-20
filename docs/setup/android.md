---
sidebar_position: 2
---

# Android Setup

## Prerequisites

- Android Studio Hedgehog or later
- `minSdk` 24+, `targetSdk` 34+

## Add the SDK

Download `ara-sdk.aar` from the [latest GitHub Release](https://github.com/ara-mesh/ara/releases/latest)
and place it in your app's `libs/` directory:

```
app/
└── libs/
    └── ara-sdk.aar
```

**`app/build.gradle.kts`**

```kotlin
dependencies {
    implementation(files("libs/ara-sdk.aar"))
}
```

## Permissions

Add to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />

<!-- Required for UDP LAN broadcast -->
<uses-permission android:name="android.permission.CHANGE_WIFI_MULTICAST_STATE" />
```

## Quick start

```kotlin
import com.aramesh.sdk.v1.Engine
import com.aramesh.sdk.v1.Migration

val migrations = listOf(
    Migration(
        version = 1,
        description = "messages table",
        sql = """
            CREATE TABLE IF NOT EXISTS messages (
                id         TEXT PRIMARY KEY,
                content    TEXT NOT NULL DEFAULT '',
                created_at INTEGER NOT NULL DEFAULT 0
            ) STRICT;
        """.trimIndent(),
        sync = listOf("messages"),
    )
)

val dbPath = filesDir.absolutePath + "/ara.db"
val node = Ara.open(context, dbPath, migrations)

// Write
node.exec(
    "INSERT INTO messages (id, content, created_at) VALUES (?, ?, ?)",
    listOf("msg-1", "Hello mesh", System.currentTimeMillis()),
)

// Read
val rows = node.query("SELECT id, content FROM messages ORDER BY created_at DESC")
rows.forEach { row ->
    println("${row["id"]}: ${row["content"]}")
}

// Close when done (e.g. in ViewModel.onCleared())
node.close()
```

## Add a transport

```kotlin
// UDP LAN (no infrastructure needed)
node.addTransportUDP()

// Meshtastic LoRa via USB serial (requires USB OTG cable)
node.addTransportMeshtastic(portPath = "/dev/ttyUSB0", channel = 0)

// MQTT (requires broker)
node.addTransportMQTT(brokerUrl = "tcp://192.168.1.100:1883", networkId = "my-network")
```

### Meshtastic setup

Requires:
- USB OTG cable (Android device → Meshtastic radio)
- Meshtastic radio flashed with standard firmware

#### Find serial port

Use the `usb-serial-for-android` library to discover and connect to the Meshtastic device:

```kotlin
// build.gradle
dependencies {
    implementation("com.github.mik3y:usb-serial-for-android:3.6.0")
}
```

```kotlin
import com.hoho.android.usbserial.driver.UsbSerialProber

// Discover available serial ports
val manager = getSystemService(Context.USB_SERVICE) as UsbManager
val drivers = UsbSerialProber.getDefaultProber().findAllDrivers(manager)

if (drivers.isEmpty()) {
    // No serial devices found
    return
}

// Use the first available driver
val driver = drivers[0]
val deviceName = driver.device.deviceName  // e.g. "/dev/bus/usb/1.1/1.0"

// Request permission if needed
if (manager.openDevice(driver.device) == null) {
    val intent = PendingIntent.getBroadcast(this, 0, Intent("com.aramesh.USB_PERMISSION"), 0)
    manager.requestPermission(driver.device, intent)
}

// Pass the device path to Ara
node.addTransportMeshtastic(deviceName, 0)
```

The device name is typically `/dev/bus/usb/{bus}.{port}/{device}` but can be mapped to `/dev/ttyUSB*` on some devices.

## Message ordering

Sort synced messages by `rowid` rather than `created_at` to avoid ordering issues from
clock skew between devices:

```kotlin
val rows = node.query("SELECT * FROM messages ORDER BY rowid ASC LIMIT 200")
```

`rowid` increments at local insert time — locally sent messages appear at the bottom as
you send them; synced messages appear at the bottom when they arrive, regardless of the
sender's clock.

## ViewModel pattern

See the [example app](https://github.com/ara-mesh/ara/releases/latest) for a
complete `AndroidViewModel` implementation with coroutines, state flow, and polling.
