import { DEFAULT_BASE, DEFAULT_FN_WIN, DEFAULT_FN_MAC, KEYS_BY_SLOT } from './layout.js';

export class SimulatedKeyboard {
  constructor() {
    this.log = [];
    this.reply = new Uint8Array(64);
    this.profile = 0;
    this.keys = [0, 1, 2, 3].map(() => Uint8Array.from(DEFAULT_BASE));
    this.ramKeys = Uint8Array.from(DEFAULT_BASE);
    this.fn = { 0: Uint8Array.from(DEFAULT_FN_WIN), 1: Uint8Array.from(DEFAULT_FN_MAC) };
    this.macros = Array.from({ length: 16 }, () => new Uint8Array(256).fill(255));
    this.led = [2, 2, 4, 2, 250, 255, 250];
    this.reportRate = 0;
    this.options = [0, 0, 0, 0, 0];
    this.autoOs = 0;
    const blank = (value) => {
      const t = new Array(128).fill(0);
      for (const slot of KEYS_BY_SLOT.keys()) t[slot] = value;
      return t;
    };
    this.mag = [0, 1, 2, 3].map(() => ({
      0: blank(400), 1: blank(400), 2: blank(60), 3: blank(60), 6: blank(60), 7: blank(0x80), 251: blank(0),
    }));
  }

  sendFeature(report) {
    this.log.push(report.slice());
    const r = report;
    const checksumAt = r[0] === 0x07 ? 8 : 7;
    const sum = r.slice(0, checksumAt).reduce((a, b) => a + b, 0);
    if (r[checksumAt] !== 255 - (sum & 255)) throw new Error(`Bad checksum on 0x${r[0].toString(16)}`);
    this._handle(r);
  }

  recvFeature() { return this.reply; }

  _echo(...bytes) {
    this.reply = new Uint8Array(64);
    this.reply.set(bytes);
  }

  _table(data, pageIndex) {
    this.reply = new Uint8Array(64);
    this.reply.set(data.slice(pageIndex * 64, pageIndex * 64 + 64));
  }

  _handle(r) {
    const mag = this.mag[this.profile];
    const data = r.slice(8);
    switch (r[0]) {
      case 0x8f: return this._echo(0x8f, 0x56, 0x0b, 0, 0, 0, 0, 0x03, 0x05);
      case 0xe6: return this._echo(0xe6);
      case 0x83: return this._echo(0x83, 0, this.reportRate);
      case 0x03: this.reportRate = r[2]; return undefined;
      case 0x84: return this._echo(0x84, this.profile);
      case 0x04: this.profile = r[1]; this.ramKeys = this.keys[r[1]].slice(); return undefined;
      case 0x87: return this._echo(0x87, ...this.led);
      case 0x07: this.led = [...r.slice(1, 8)]; return undefined;
      case 0x89: return this._echo(0x89, ...this.options);
      case 0x09: this.options = [...r.slice(1, 6)]; return undefined;
      case 0x97: return this._echo(0x97, this.autoOs);
      case 0x17: this.autoOs = r[1]; return undefined;
      case 0x8a: return this._table(this.keys[r[1]], r[3]);
      case 0x0a: // the real firmware saves its whole RAM keymap to the named profile
        this.ramKeys.set(data.slice(0, 4), r[2] * 4);
        this.keys[r[1]] = this.ramKeys.slice();
        return undefined;
      case 0x90: return this._table(this.fn[r[1]], r[4]);
      case 0x10: this.fn[r[1]].set(data.slice(0, 4), r[3] * 4); return undefined;
      case 0x8b: return this._table(this.macros[r[1]], r[2]);
      case 0x0b:
        if (r[2] === 0) this.macros[r[1]].fill(0);
        this.macros[r[1]].set(data.slice(0, 56).slice(0, 256 - r[2] * 56), r[2] * 56);
        return undefined;
      case 0xe5: {
        const table = mag[r[1]] ?? new Array(128).fill(0);
        const wide = ![7, 251].includes(r[1]);
        return this._table(wide ? table.flatMap((v) => [v & 255, v >> 8]) : table, r[3]);
      }
      case 0x65: {
        const table = mag[r[1]];
        const wide = ![7, 251].includes(r[1]);
        const width = wide ? 2 : 1;
        for (let i = 0; i < 56; i += width) {
          const slot = (r[3] * 56 + i) / width;
          if (slot < 128) table[slot] = wide ? data[i] | (data[i + 1] << 8) : data[i];
        }
        return undefined;
      }
      default: throw new Error(`Simulator: unknown command 0x${r[0].toString(16)}`);
    }
  }
}
