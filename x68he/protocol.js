// Attack Shark X68HE configuration protocol (Rongyuan ry5088 family, model id 2902).
// Every message is a 64-byte feature report with report id 0 on the FFFF:0002 collection.
// This module knows nothing about the page, so tests can run it against a simulator or
// the real keyboard through a different transport.
//
// I don't know much about what happens in this code, I let claude make this

export const VENDOR_ID = 0x3151;
export const PRODUCT_ID = 0x502d;
export const MODEL_ID = 2902;
export const USAGE_PAGE = 0xffff;
export const USAGE = 0x02;

export const KEY_SLOTS = 128;
export const PROFILES = 4;
export const MACRO_SLOTS = 16;
export const MACRO_BYTES = 256;

const CMD = {
  setReportRate: 0x03, setProfile: 0x04, setLed: 0x07, setOptions: 0x09, setKey: 0x0a,
  setMacro: 0x0b, setFnKey: 0x10, setAutoOs: 0x17, setMagnetism: 0x65,
  getReportRate: 0x83, getProfile: 0x84, getLed: 0x87, getOptions: 0x89, getKeys: 0x8a,
  getMacro: 0x8b, getId: 0x8f, getFnKeys: 0x90, getAutoOs: 0x97, getMagnetism: 0xe5,
  getFeatures: 0xe6,
};

// Nothing outside this list can reach the keyboard. Firmware update, bootloader, flash
// erase, factory reset and calibration opcodes are deliberately absent.
const ALLOWED = new Set(Object.values(CMD));
const ALLOWED_MAGNETISM_WRITES = new Set([0, 1, 2, 3, 6, 7, 251]);

export const MAG = { travel: 0, lift: 1, rtPress: 2, rtLift: 3, deadzone: 6, modes: 7, topDeadzone: 251 };
const MAG_ONE_BYTE = new Set([MAG.modes, MAG.topDeadzone]);
const MAG_WRITE_ORDER = [MAG.modes, MAG.travel, MAG.lift, MAG.rtPress, MAG.rtLift, MAG.deadzone, MAG.topDeadzone];
export const RT_FLAG = 0x80;

const REPORT_RATES = [8000, 4000, 2000, 1000, 500, 250, 125];
const OS_MODES = ['win', 'mac', 'ios', 'android'];
const COMMON_COLORS = { 0: 0xff0000, 1: 0xff8000, 2: 0xffff00, 3: 0x00ff00, 4: 0x00ffff, 5: 0x0000ff, 6: 0xff00ff };
const COLOR_RAINBOW = 8;
const COLOR_CUSTOM = 7;
const MAX_SPEED = 4;
const FIRMWARE_WHITE = 0xfafffa; // pure white is stored as this tint

export const EFFECTS = [
  'Off', 'Static', 'Breathing', 'Neon', 'Wave', 'Ripple', 'Raindrop', 'Snake', 'Reactive',
  'Converge', 'Sine wave', 'Kaleidoscope', 'Line wave', 'Custom picture', 'Laser', 'Circle wave',
  'Dazzle', 'Rain down', 'Meteor', 'Reactive off', 'Music (legacy)', 'Screen sync', 'Music',
  'Train', 'Fireworks', 'User colour',
];

// Effects offered in the UI, with their direction/variant options. Music, screen sync and
// the per-key picture need host software this page does not provide, so they are read-only.
export const EFFECT_OPTIONS = {
  0: [], 1: [], 2: [], 3: [], 4: ['Right', 'Left', 'Down', 'Up'], 5: [], 6: [],
  7: ['Zigzag', 'Spiral'], 8: [], 9: [], 10: [], 11: ['Outward', 'Inward'],
  12: ['Right', 'Left'], 14: [], 15: ['Counter-clockwise', 'Clockwise'], 16: [], 17: [], 18: [], 19: [],
};
export const EFFECT_NO_COLOR = new Set([0, 3]);
export const EFFECT_NO_SPEED = new Set([0, 1]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function encode(bytes, checksumAt = 7) {
  const report = new Uint8Array(64);
  report.set(bytes);
  let sum = 0;
  for (let i = 0; i < checksumAt; i++) sum += report[i];
  report[checksumAt] = 255 - (sum & 255);
  return report;
}

export class WebHidTransport {
  constructor(device) { this.device = device; }
  sendFeature(report) { return this.device.sendFeatureReport(0, report); }
  async recvFeature() {
    const view = await this.device.receiveFeatureReport(0);
    return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  }
}

export class X68HE {
  constructor(transport, { settle = 10, writeDelay = 150 } = {}) {
    this.transport = transport;
    this.settle = settle;
    this.writeDelay = writeDelay;
    this.queue = Promise.resolve();
    this.stepsPerMm = null;
  }

  // Requests must never interleave: a reply belongs to the last request sent.
  _serial(job) {
    const run = this.queue.then(job, job);
    this.queue = run.catch(() => {});
    return run;
  }

  async _send(bytes, checksumAt) {
    if (!ALLOWED.has(bytes[0])) throw new Error(`Blocked opcode 0x${bytes[0].toString(16)}`);
    await sleep(this.settle);
    await this.transport.sendFeature(encode(bytes, checksumAt));
  }

  async _read() {
    await sleep(this.settle);
    let reply = await this.transport.recvFeature();
    if (reply.length === 65) reply = reply.subarray(1); // some stacks keep the report id byte
    return reply;
  }

  write(bytes, checksumAt = 7) {
    return this._serial(() => this._send(bytes, checksumAt));
  }

  // Replies to these commands echo the opcode, so a stale reply can be detected.
  query(bytes) {
    return this._serial(async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        await this._send(bytes);
        const reply = await this._read();
        if (reply[0] === bytes[0]) return reply;
        await sleep(50);
      }
      throw new Error(`No reply to command 0x${bytes[0].toString(16)}`);
    });
  }

  // Paged table reads carry raw data with no echo header.
  page(bytes) {
    return this._serial(async () => {
      await this._send(bytes);
      return (await this._read()).slice(0, 64);
    });
  }

  async _pages(count, makeRequest) {
    const out = new Uint8Array(count * 64);
    for (let i = 0; i < count; i++) out.set(await this.page(makeRequest(i)), i * 64);
    return out;
  }

  async identify() {
    const r = await this.query([CMD.getId]);
    const id = r[1] | (r[2] << 8) | (r[3] << 16) | (r[4] * 2 ** 24);
    const version = (r[8] << 8) | r[7];
    const features = await this.query([CMD.getFeatures]);
    if (features[1] === 170) this.stepsPerMm = { 0: 100, 1: 200, 2: 1000 }[features[2]] ?? null;
    else if (version >= 1280) this.stepsPerMm = 200;
    else this.stepsPerMm = null; // older firmware uses other scales; magnetism stays read-only
    return { id, version, supported: id === MODEL_ID };
  }

  async getProfile() { return (await this.query([CMD.getProfile]))[1]; }
  async setProfile(profile) {
    await this.write([CMD.setProfile, profile]);
    await sleep(Math.max(this.writeDelay, 200));
  }

  async getReportRate() { return REPORT_RATES[(await this.query([CMD.getReportRate]))[2]]; }
  async setReportRate(rate) {
    const code = REPORT_RATES.indexOf(rate);
    if (code < 0) throw new Error(`Unsupported report rate ${rate}`);
    await this.write([CMD.setReportRate, 0, code]);
    await sleep(this.writeDelay);
  }

  async getOptions() {
    const r = await this.query([CMD.getOptions]);
    return {
      os: OS_MODES[r[1]] ?? 'win', fnLayer: r[2], antiMisfire: !!r[3],
      rtStabilityMs: r[4] > 5 ? 0 : r[4] * 25, wasdSwap: r[5] === 1,
    };
  }
  async setOptions(o) {
    await this.write([
      CMD.setOptions, Math.max(0, OS_MODES.indexOf(o.os)), o.fnLayer, o.antiMisfire ? 1 : 0,
      o.rtStabilityMs / 25, o.wasdSwap ? 1 : 0,
    ]);
    await sleep(this.writeDelay);
  }

  async getAutoOs() { return (await this.query([CMD.getAutoOs]))[1] === 1; }
  async setAutoOs(on) {
    await this.write([CMD.setAutoOs, on ? 1 : 0]);
    await sleep(this.writeDelay);
  }

  async getLed() {
    const r = await this.query([CMD.getLed]);
    const low = r[4] & 15;
    let rgb = (r[5] << 16) | (r[6] << 8) | r[7];
    if (low in COMMON_COLORS) rgb = COMMON_COLORS[low];
    if (rgb === FIRMWARE_WHITE) rgb = 0xffffff;
    return {
      effect: r[1], speed: MAX_SPEED - r[2], brightness: r[3], option: r[4] >> 4,
      rainbow: low === COLOR_RAINBOW, rgb, raw: [...r.subarray(1, 8)],
    };
  }
  async setLed({ effect, speed, brightness, option = 0, rainbow = false, rgb = 0xffffff }) {
    const color = rgb === 0xffffff ? FIRMWARE_WHITE : rgb;
    await this.write([
      CMD.setLed, effect, MAX_SPEED - speed, brightness,
      (option << 4) | (rainbow ? COLOR_RAINBOW : COLOR_CUSTOM),
      (color >> 16) & 255, (color >> 8) & 255, color & 255,
    ], 8);
    await sleep(this.writeDelay);
  }
  // Puts back the exact stored bytes, including effects the UI cannot edit.
  async setLedRaw(raw) {
    await this.write([CMD.setLed, ...raw], 8);
    await sleep(this.writeDelay);
  }

  getKeys(profile) { return this._pages(8, (i) => [CMD.getKeys, profile, 255, i, 0]); }
  async _writeKey(profile, slot, value) {
    await this.write([CMD.setKey, profile, slot, 0, 0, 1, 0, 0, ...value]);
    await sleep(this.writeDelay);
  }

  // The firmware keeps one RAM keymap and saves all of it to the profile named in a key
  // write, so writing to any profile but the active one overwrites that profile with the
  // active one's keys. Activating the target first avoids it; the read-back catches the rest.
  async setKey(profile, slot, value) {
    if (slot < 0 || slot >= KEY_SLOTS) throw new Error(`Bad key slot ${slot}`);
    if ((await this.getProfile()) !== profile) await this.setProfile(profile);
    const expected = await this.getKeys(profile);
    expected.set(value, slot * 4);
    await this._writeKey(profile, slot, value);
    const strayKeys = (table) => Array.from({ length: KEY_SLOTS }, (_, i) => i)
      .filter((i) => [0, 1, 2, 3].some((b) => table[i * 4 + b] !== expected[i * 4 + b]));
    const wrong = strayKeys(await this.getKeys(profile));
    for (const i of wrong) await this._writeKey(profile, i, [...expected.slice(i * 4, i * 4 + 4)]);
    if (wrong.length && strayKeys(await this.getKeys(profile)).length) {
      throw new Error(`Keymap on profile ${profile + 1} could not be verified after writing`);
    }
  }

  getFnKeys(os) {
    const sys = OS_MODES.indexOf(os);
    return this._pages(8, (i) => [CMD.getFnKeys, sys, 0, 255, i]);
  }
  async setFnKey(os, slot, value) {
    if (slot < 0 || slot >= KEY_SLOTS) throw new Error(`Bad key slot ${slot}`);
    await this.write([CMD.setFnKey, OS_MODES.indexOf(os), 0, slot, 0, 0, 0, 0, ...value]);
    await sleep(this.writeDelay);
  }

  async _magTable(op, pages) {
    return this._pages(pages, (i) => [CMD.getMagnetism, op, 1, i]);
  }
  // Tables follow the active profile.
  async getMagnetism() {
    const words = (bytes) => Array.from({ length: KEY_SLOTS }, (_, i) => bytes[i * 2] | (bytes[i * 2 + 1] << 8));
    const out = {};
    out[MAG.modes] = [...(await this._magTable(MAG.modes, 2))].slice(0, KEY_SLOTS);
    for (const op of [MAG.travel, MAG.lift, MAG.rtPress, MAG.rtLift, MAG.deadzone]) {
      out[op] = words(await this._magTable(op, 4));
    }
    out[MAG.topDeadzone] = [...(await this._magTable(MAG.topDeadzone, 2))].slice(0, KEY_SLOTS);
    return out;
  }

  // tables: { [op]: full 128-entry array }. Only the tables given are written.
  async writeMagnetism(tables) {
    if (this.stepsPerMm === null) throw new Error('Unknown travel scale on this firmware');
    const ops = MAG_WRITE_ORDER.filter((op) => tables[op]);
    for (const [index, op] of ops.entries()) {
      if (!ALLOWED_MAGNETISM_WRITES.has(op)) throw new Error(`Blocked magnetism op ${op}`);
      const values = tables[op];
      if (values.length !== KEY_SLOTS) throw new Error('Magnetism table has the wrong size');
      const data = MAG_ONE_BYTE.has(op) ? values : values.flatMap((v) => [v & 255, v >> 8]);
      const pages = Math.ceil(data.length / 56);
      for (let page = 0; page < pages; page++) {
        const commit = index === ops.length - 1 && page === pages - 1 ? 1 : 0;
        await this.write([CMD.setMagnetism, op, 1, page, commit, 0, 0, 0, ...data.slice(page * 56, (page + 1) * 56)]);
      }
    }
    if (ops.length) await sleep(Math.max(this.writeDelay, 500));
  }

  async getMacroBytes(slot) {
    const out = [];
    for (let page = 0; page < 4; page++) {
      const data = await this.page([CMD.getMacro, slot, page]);
      out.push(...data);
      if (hasZeroWord(data)) break;
    }
    return Uint8Array.from(out);
  }

  async getMacro(slot) { return decodeMacro(await this.getMacroBytes(slot)); }

  async setMacro(slot, macro) { await this.setMacroBytes(slot, encodeMacro(macro)); }

  async setMacroBytes(slot, bytes) {
    const pages = [];
    for (let i = 0; i < 5; i++) {
      const chunk = bytes.slice(i * 56, (i + 1) * 56);
      if (chunk.some((b) => b !== 0)) pages.push(chunk);
    }
    if (!pages.length) throw new Error('A macro cannot be empty');
    for (const [page, chunk] of pages.entries()) {
      await this.write([CMD.setMacro, slot, page, 56, page === pages.length - 1 ? 1 : 0, 0, 0, 0, ...chunk]);
    }
    await sleep(this.writeDelay);
  }
}

function hasZeroWord(data) {
  for (let i = 0; i + 3 < data.length; i++) {
    if (!data[i] && !data[i + 1] && !data[i + 2] && !data[i + 3]) return true;
  }
  return false;
}

// A macro is { repeat, events: [{ code, down, delay }] }, delay in ms after the event.
export function encodeMacro({ repeat, events }) {
  const out = [repeat & 255, repeat >> 8];
  for (const { code, down, delay } of events) {
    // A zero delay would make the firmware read the next event as a delay field.
    const ms = Math.min(Math.max(1, Math.round(delay)), 65535);
    if (ms <= 127) out.push(code, down ? ms + 128 : ms);
    else out.push(code, down ? 128 : 0, ms & 255, ms >> 8);
  }
  if (out.length > MACRO_BYTES) throw new Error('Macro is too long for the keyboard');
  return Uint8Array.from([...out, ...new Array(MACRO_BYTES - out.length).fill(0)]);
}

export function decodeMacro(bytes) {
  const empty = bytes.length < 2 || (bytes[0] === 255 && bytes[1] === 255);
  if (empty) return { repeat: 0, events: [], empty: true };
  const events = [];
  let i = 2;
  while (i + 1 < bytes.length && (bytes[i] || bytes[i + 1])) {
    const code = bytes[i];
    if (code === 249) { // recorded mouse movement: skipped, shown as unsupported
      i += bytes[i + 1] ? 4 : 6;
      events.push({ code, down: true, delay: 0, mouseMove: true });
      continue;
    }
    const down = bytes[i + 1] > 127;
    const short = bytes[i + 1] & 127;
    if (short) { events.push({ code, down, delay: short }); i += 2; }
    else { events.push({ code, down, delay: bytes[i + 2] | (bytes[i + 3] << 8) }); i += 4; }
  }
  return { repeat: bytes[0] | (bytes[1] << 8), events, empty: false };
}
