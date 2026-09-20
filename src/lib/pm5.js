// Concept2 PM5 connection over Bluetooth Low Energy, via the Capacitor BLE
// plugin. This works both inside the packaged Android app (native BLE, no
// browser involved) and, if run as a plain website in a supporting browser,
// as a thin wrapper over Web Bluetooth — same code either way.
//
// Byte layout per Concept2's own "PM Bluetooth Smart Communication Interface
// Definition" (rev 1.25), C2 Rowing Service, General Status characteristic.
import { Capacitor } from '@capacitor/core'
import { BleClient, numbersToDataView } from '@capacitor-community/bluetooth-le'

const BASE = (hex) => `ce06${hex}-43e5-11e4-916c-0800200c9a66`
const ROWING_SERVICE_UUID = BASE('0030')
const GENERAL_STATUS_UUID = BASE('0031')
const SAMPLE_RATE_UUID = BASE('0034') // 0=1s, 1=500ms (default), 2=250ms, 3=100ms

export function isBluetoothSupported() {
  return Capacitor.isNativePlatform() || (typeof navigator !== 'undefined' && 'bluetooth' in navigator)
}

let initialized = false
async function ensureInitialized() {
  if (!initialized) {
    await BleClient.initialize()
    initialized = true
  }
}

function readUInt24LE(view, offset) {
  return view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getUint8(offset + 2) << 16)
}

// General Status (19 bytes): elapsed time (0.01s lsb, 3 bytes), distance
// (0.1m lsb, 3 bytes), then workout/interval/state enums we don't need yet.
export function parseGeneralStatus(dataView) {
  const raw = []
  for (let i = 0; i < dataView.byteLength; i++) raw.push(dataView.getUint8(i))
  return {
    elapsedSeconds: readUInt24LE(dataView, 0) / 100,
    distanceMeters: readUInt24LE(dataView, 3) / 10,
    raw
  }
}

// onStatus(parsedGeneralStatus) fires on every notification.
// onDisconnect() fires if the PM5 drops the connection.
export async function connectPM5({ onStatus, onDisconnect }) {
  await ensureInitialized()

  const device = await BleClient.requestDevice({
    services: [ROWING_SERVICE_UUID],
    optionalServices: [ROWING_SERVICE_UUID]
  })

  await BleClient.connect(device.deviceId, () => onDisconnect?.())

  // Fastest notification rate (100ms); non-fatal if the firmware rejects it.
  try {
    await BleClient.write(device.deviceId, ROWING_SERVICE_UUID, SAMPLE_RATE_UUID, numbersToDataView([3]))
  } catch {
    // fine, default rate (500ms) still works
  }

  await BleClient.startNotifications(device.deviceId, ROWING_SERVICE_UUID, GENERAL_STATUS_UUID, (value) => {
    onStatus(parseGeneralStatus(value))
  })

  return {
    deviceName: device.name || 'PM5',
    disconnect() {
      BleClient.stopNotifications(device.deviceId, ROWING_SERVICE_UUID, GENERAL_STATUS_UUID).catch(() => {})
      BleClient.disconnect(device.deviceId).catch(() => {})
    }
  }
}
