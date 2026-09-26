import { get, set } from 'idb-keyval'

const KEY = 'rower-records'

// One record per (date, category): { date, category, time, samples }.
// samples is elapsed-seconds-since-start -> cumulative meters, cropped to
// that category's distance, so each record is self-contained.
export async function loadRecords() {
  return (await get(KEY)) || []
}

function upsert(records, incoming) {
  const key = (r) => `${r.date}::${r.category}`
  const incomingKeys = new Set(incoming.map(key))
  const kept = records.filter((r) => !incomingKeys.has(key(r)))
  return [...kept, ...incoming]
}

export async function saveRecords(newRecords) {
  const records = await loadRecords()
  const merged = upsert(records, newRecords)
  await set(KEY, merged)
  return merged
}

// A completed run only overwrites the stored record for that (date,
// category) if it's actually faster — playing the same category twice in a
// day keeps whichever attempt had the better time.
export async function saveRecordIfBetter(record) {
  const records = await loadRecords()
  const existingIndex = records.findIndex((r) => r.date === record.date && r.category === record.category)
  if (existingIndex === -1) {
    records.push(record)
  } else if (record.time < records[existingIndex].time) {
    records[existingIndex] = record
  }
  await set(KEY, records)
  return records
}

// Local calendar date (YYYY-MM-DD), not UTC, so a late-evening row still
// counts as today.
export function todayKey() {
  return new Date().toLocaleDateString('en-CA')
}
