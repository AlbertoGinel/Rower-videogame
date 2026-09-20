# Rower Ghost Race

A small offline PWA that turns rowing (Concept2 PM5) into a race against your own past sessions.

## Short answer: yes, this is possible

Everything you described is buildable as a PWA. The only genuinely hard constraint is **live data from the PM5 depends on your phone's OS** (see "Connecting to the PM5" below) — everything else (the game, the ghosts, the storage) is straightforward and works fully offline on any phone.

## Core concept

- The track is a single vertical line. You are always in the middle (unless you're in 1st or last place).
- Above you: the nearest racer who is currently ahead. Below you: the nearest racer currently behind.
- Every racer is a **ghost** — a full recording of one past day's row (one ghost per calendar day).
- Ghosts show their date, category, and position/gap. When a ghost finishes its category distance, its ball disappears from that race.
- Categories: 500m, 1500m, 2000m, 2500m, 3000m. All five race simultaneously off the same live row — as you pass 500m you get a 500m result, at 1500m a 1500m result, etc. Records/leaderboards are kept **per category**.
- Start button → 10s countdown → race begins.
- Early days are boring (no ghosts yet); the game gets interesting once you're racing your own history and trying to beat it.

## Data model

Each row session is stored as one record per day:

```json
{
  "date": "2026-09-18",
  "samples": { "0": 0, "5": 21.3, "10": 44.0, "15": 66.8, "...": "..." },
  "categoryResults": { "500": 118.4, "1500": 361.2, "2000": null, "2500": null, "3000": null }
}
```

- `samples` is the time→distance hash table (elapsed seconds → meters rowed so far). Sample interval can be as coarse or fine as the input method allows (see below) — the game interpolates between samples for smooth ball motion, so it doesn't need to be dense.
- `categoryResults` is filled in as/when that day's row actually reached each distance (a day that only rowed 2000m has no 1500m/2500m/3000m *ghost* beyond 2000m... actually it has 500m/1500m/2000m results and no 2500m/3000m — those categories simply have no ghost for that day).
- All sessions live in the phone's local storage (IndexedDB), never leave the device. Nothing to sync, no backend, no login — matches your "no connection to anything" requirement for the game itself.

## Rendering the balls

For a given category race, at elapsed time *t*:
1. Compute your live distance and every active ghost's distance at *t* (interpolated from their `samples` table).
2. Sort everyone by distance → that's the ranking.
3. Find your immediate neighbors (one ahead, one behind).
4. Map the *gap* (not absolute distance) to vertical screen position, clamped/scaled so a 400m gap on day 3 and a 4m gap on day 40 both read as "clearly ahead" vs "neck and neck" — a fixed linear meters→pixels scale would make early sessions either off-screen or the whole game feel flat once gaps shrink, so the mapping should compress large gaps and give fine resolution near zero (e.g. a `tanh`/log curve on the gap, not a raw linear one).
5. A ghost whose distance ≥ category target is finished → remove its ball from that category's view (and it can't be caught).

This is genuinely simple: no physics, no collision, just "sort by distance, show my two neighbors, map gap → y position."

## Connecting to the PM5 — what's real

Concept2 publishes official protocol docs (no login needed):
- **CSAFE Communication Definition** (covers USB, Bluetooth Smart, RS485 framing) — [PM5_CSAFECommunicationDefinition.pdf](https://www.concept2.sg/files/pdf/us/monitors/PM5_CSAFECommunicationDefinition.pdf)
- **Bluetooth Smart Interface Definition** (the proprietary BLE GATT service/characteristics) — [PM5_BluetoothSmartInterfaceDefinition.pdf](http://www.concept2.co.in/files/pdf/us/monitors/PM5_BluetoothSmartInterfaceDefinition.pdf)
- Landing page for all of it: concept2.com/support/software-development

You only need one field out of all of this: cumulative distance (meters), sampled periodically. That's a tiny slice of what those docs cover, so you don't need to read them cover to cover — just the "distance" field in the rowing-status characteristic/frame.

Two real transports exist, with different phone-OS support:

| Transport | How it works | Works on |
|---|---|---|
| **Web Bluetooth (BLE)** | PM5 is a BLE peripheral; browser connects directly, no cable | Chrome/Edge on **Android** and desktop. **Not supported at all in iOS Safari, or in any browser on iOS** (Apple blocks it engine-wide) |
| **WebUSB** | Phone connects to PM5's USB port via an OTG cable; PM5 speaks CSAFE over USB HID | Chrome on **Android** (with OTG cable) and desktop. **Not supported on iOS**, same Apple restriction |

**Decided: the gym phone is Android** → Web Bluetooth is the path. That's the simplest of the two real options anyway — no cable, standard GATT read, works from an installed PWA in Chrome, no native wrapper ever needed.

## Suggested build order

**Phase 0 — the actual game, no hardware yet (building this first).** Race mechanic, storage, and UI against manually-entered or synthetic time/distance data. This is exactly what you asked for as the first test ("we will test it with a pre-recorded day being the current") — a session is just a `samples` table, so a "live" row can be simulated by feeding one in on a timer. Zero dependency on Concept2 docs, and it validates the fun part (is the ghost-race mechanic actually motivating?) fastest.

**Phase 1 — real capture via Web Bluetooth.** From the PWA, connect to the PM5 as a BLE peripheral and poll its rowing-status characteristic every 1–2s for cumulative distance, writing straight into that day's `samples` table as you row. Chrome on Android supports this natively from an installed PWA — no cable, no native shell.

## Open questions for you

1. For Phase 0, is a fixed sample interval (e.g. every 5s) fine, or do you want variable/event-based sampling?
2. Any interest in the PM5's stroke rate / pace fields for cosmetic HUD info, or is cumulative distance genuinely the only thing the game needs (as you said)?
