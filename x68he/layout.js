// Physical layout and key tables for the X68HE (firmware layout "Common66_X68", 66 keys).
// A slot is the key's position in the firmware's 128-entry matrix.

const pad = (values) => [...values, ...new Array(512 - values.length).fill(0)];
export const DEFAULT_BASE = pad([0,0,0,0,0,0,41,0,0,0,43,0,0,0,57,0,0,0,225,0,0,0,224,0,0,0,58,0,0,0,30,0,0,0,20,0,0,0,4,0,0,0,100,0,0,0,227,0,0,0,59,0,0,0,31,0,0,0,26,0,0,0,22,0,0,0,29,0,0,0,226,0,0,0,60,0,0,0,32,0,0,0,8,0,0,0,7,0,0,0,27,0,0,0,0,0,0,0,61,0,0,0,33,0,0,0,21,0,0,0,9,0,0,0,6,0,0,0,0,0,0,0,62,0,0,0,34,0,0,0,23,0,0,0,10,0,0,0,25,0,0,0,0,0,0,0,63,0,0,0,35,0,0,0,28,0,0,0,11,0,0,0,5,0,0,0,44,0,0,0,64,0,0,0,36,0,0,0,24,0,0,0,13,0,0,0,17,0,0,0,0,0,0,0,65,0,0,0,37,0,0,0,12,0,0,0,14,0,0,0,16,0,0,0,0,0,0,0,66,0,0,0,38,0,0,0,18,0,0,0,15,0,0,0,54,0,0,0,0,0,0,0,67,0,0,0,39,0,0,0,19,0,0,0,51,0,0,0,55,0,10,1,0,0,0,0,68,0,0,0,45,0,0,0,47,0,0,0,52,0,0,0,56,0,0,0,228,0,0,0,69,0,0,0,46,0,0,0,48,0,0,0,50,0,0,0,229,0,0,0,80,0,0,0,0,0,0,0,42,0,0,0,49,0,0,0,40,0,0,0,82,0,0,0,81,0,0,0,0,0,0,0,76,0,0,0,75,0,0,0,78,0,0,0,0,0,0,0,79]);
export const DEFAULT_FN_WIN = pad([0,0,0,0,0,0,53,0,10,4,0,0,10,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,112,0,0,0,0,0,10,5,0,0,0,0,0,0,10,3,0,0,0,0,0,0,3,0,111,0,0,0,0,0,10,5,1,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,146,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,35,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,131,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,182,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,181,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,205,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,183,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,226,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,234,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,233,0,0,0,0,0,0,0,0,0,10,13,0,0,13,3,1,0,0,0,0,0,10,12,0,0,13,1,0,0,13,5,1,0,13,2,1,0,13,2,2,0,0,0,0,0,0,0,74,0,0,0,73,0,0,0,77,0,0,0,0,0,13,3,2]);
export const DEFAULT_FN_MAC = pad([0,0,0,0,0,0,53,0,10,4,0,0,10,2,0,0,0,0,0,0,0,0,0,0,3,0,112,0,3,0,112,0,0,0,0,0,10,5,0,0,0,0,0,0,0,0,0,0,3,0,111,0,3,0,111,0,0,0,0,0,10,5,1,0,0,0,0,0,0,0,0,0,3,0,146,1,0,0,224,82,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,35,2,18,0,226,44,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,131,1,0,0,224,81,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,182,0,0,0,227,44,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,181,0,3,0,182,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,205,0,3,0,205,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,183,0,3,0,181,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,226,0,3,0,226,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,234,0,3,0,234,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,0,233,0,3,0,233,0,0,0,0,0,0,0,0,0,10,13,0,0,13,3,1,0,0,0,0,0,10,12,0,0,13,1,0,0,13,5,1,0,13,2,1,0,13,2,2,0,0,0,0,0,0,0,74,0,0,0,73,0,0,0,77,0,0,0,0,0,13,3,2]);

// [label, HID code or null for Fn, width in key units]; a null label is a gap.
const ROWS = [
  [['Esc', 41], ['1', 30], ['2', 31], ['3', 32], ['4', 33], ['5', 34], ['6', 35], ['7', 36], ['8', 37], ['9', 38], ['0', 39], ['-', 45], ['=', 46], ['Bksp', 42, 2], ['Del', 76]],
  [['Tab', 43, 1.5], ['Q', 20], ['W', 26], ['E', 8], ['R', 21], ['T', 23], ['Y', 28], ['U', 24], ['I', 12], ['O', 18], ['P', 19], ['[', 47], [']', 48], ['\\', 49, 1.5], ['PgUp', 75]],
  [['Caps', 57, 1.75], ['A', 4], ['S', 22], ['D', 7], ['F', 9], ['G', 10], ['H', 11], ['J', 13], ['K', 14], ['L', 15], [';', 51], ["'", 52], ['Enter', 40, 2.25], ['PgDn', 78]],
  [['Shift', 225, 2.25], ['Z', 29], ['X', 27], ['C', 6], ['V', 25], ['B', 5], ['N', 17], ['M', 16], [',', 54], ['.', 55], ['/', 56], ['Shift', 229, 1.75], ['Up', 82], [null, null, 1]],
  [['Ctrl', 224, 1.25], ['Win', 227, 1.25], ['Alt', 226, 1.25], ['Space', 44, 6.25], ['Fn', null], ['Ctrl', 228], [null, null, 1], ['Left', 80], ['Down', 81], ['Right', 79]],
];

function slotOf(hid) {
  for (let i = 0; i < 128; i++) {
    const v = DEFAULT_BASE.slice(i * 4, i * 4 + 4);
    if (hid === null ? v[0] === 10 && v[1] === 1 : v[0] === 0 && v[1] === 0 && v[2] === hid && v[3] === 0) return i;
  }
  throw new Error(`Key ${hid} is not in the default matrix`);
}

export const LAYOUT = ROWS.map((row) => row.map(([label, hid, width = 1]) => (
  label === null ? { gap: true, width } : { label, slot: slotOf(hid), width }
)));

export const KEYS_BY_SLOT = new Map(LAYOUT.flat().filter((k) => !k.gap).map((k) => [k.slot, k]));

export const DEFAULT_KEY = (slot) => DEFAULT_BASE.slice(slot * 4, slot * 4 + 4);

// Bindable keys: [label, HID code, KeyboardEvent.code].
const named = [
  ['Esc', 41, 'Escape'], ['Tab', 43, 'Tab'], ['Caps', 57, 'CapsLock'], ['Enter', 40, 'Enter'], ['Space', 44, 'Space'],
  ['Bksp', 42, 'Backspace'], ['Del', 76, 'Delete'], ['Ins', 73, 'Insert'], ['Home', 74, 'Home'], ['End', 77, 'End'],
  ['PgUp', 75, 'PageUp'], ['PgDn', 78, 'PageDown'], ['Up', 82, 'ArrowUp'], ['Down', 81, 'ArrowDown'], ['Left', 80, 'ArrowLeft'],
  ['Right', 79, 'ArrowRight'], ['`', 53, 'Backquote'], ['-', 45, 'Minus'], ['=', 46, 'Equal'], ['[', 47, 'BracketLeft'],
  [']', 48, 'BracketRight'], ['\\', 49, 'Backslash'], [';', 51, 'Semicolon'], ["'", 52, 'Quote'], [',', 54, 'Comma'],
  ['.', 55, 'Period'], ['/', 56, 'Slash'], ['PrtSc', 70, 'PrintScreen'], ['ScrLk', 71, 'ScrollLock'], ['Pause', 72, 'Pause'],
  ['Menu', 101, 'ContextMenu'],
];
const MODIFIERS = [
  ['LCtrl', 224, 'ControlLeft'], ['LShift', 225, 'ShiftLeft'], ['LAlt', 226, 'AltLeft'], ['LWin', 227, 'MetaLeft'],
  ['RCtrl', 228, 'ControlRight'], ['RShift', 229, 'ShiftRight'], ['RAlt', 230, 'AltRight'], ['RWin', 231, 'MetaRight'],
];
const letters = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((c, i) => [c, 4 + i, `Key${c}`]);
const digits = [...'1234567890'].map((c, i) => [c, 30 + i, `Digit${c}`]);
const functionKeys = Array.from({ length: 12 }, (_, i) => [`F${i + 1}`, 58 + i, `F${i + 1}`]);
const extendedFunctionKeys = Array.from({ length: 12 }, (_, i) => [`F${i + 13}`, 104 + i, `F${i + 13}`]);

export const KEY_GROUPS = {
  Letters: letters, Numbers: digits, Function: [...functionKeys, ...extendedFunctionKeys],
  Navigation: named, Modifiers: MODIFIERS,
};
const ALL_KEYS = Object.values(KEY_GROUPS).flat();
export const HID_LABEL = new Map(ALL_KEYS.map(([label, hid]) => [hid, label]));
export const CODE_TO_HID = new Map(ALL_KEYS.map(([, hid, code]) => [code, hid]));
export const MODIFIER_KEYS = MODIFIERS.slice(0, 4);

export const SPECIAL_ACTIONS = {
  Media: [
    ['Play/Pause', [3, 0, 205, 0]], ['Next track', [3, 0, 181, 0]], ['Prev track', [3, 0, 182, 0]], ['Stop', [3, 0, 183, 0]],
    ['Mute', [3, 0, 226, 0]], ['Volume up', [3, 0, 233, 0]], ['Volume down', [3, 0, 234, 0]],
    ['Screen bright +', [3, 0, 111, 0]], ['Screen bright -', [3, 0, 112, 0]],
    ['Calculator', [3, 0, 146, 1]], ['Mail', [3, 0, 138, 1]], ['Web home', [3, 0, 35, 2]],
  ],
  Mouse: [
    ['Left click', [1, 0, 240, 0]], ['Right click', [1, 0, 241, 0]], ['Middle click', [1, 0, 242, 0]],
    ['Back', [1, 0, 243, 0]], ['Forward', [1, 0, 244, 0]], ['Wheel up', [1, 0, 245, 1]], ['Wheel down', [1, 0, 245, 255]],
  ],
  Keyboard: [
    ['Fn', [10, 1, 0, 0]], ['Win lock', [10, 3, 0, 0]], ['WASD swap', [10, 10, 0, 0]], ['Fn lock', [10, 13, 0, 0]],
    ['Win mode', [10, 5, 0, 0]], ['Mac mode', [10, 5, 1, 0]], ['Profile next', [8, 0, 3, 0]],
    ['Report rate next', [5, 0, 3, 0]], ['Reset key combo', [10, 2, 0, 0]],
  ],
  Lighting: [
    ['LED on/off', [13, 0, 0, 0]], ['Next effect', [13, 1, 1, 0]], ['Prev effect', [13, 1, 2, 0]],
    ['Brightness +', [13, 2, 1, 0]], ['Brightness -', [13, 2, 2, 0]], ['Speed +', [13, 3, 1, 0]], ['Speed -', [13, 3, 2, 0]],
    ['Next colour', [13, 5, 1, 3]], ['Prev colour', [13, 5, 1, 4]], ['Direction', [13, 5, 0, 0]],
  ],
};

const sameBytes = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// Short text for what a four-byte key value does.
export function describeBinding(v) {
  const bytes = [...v];
  if (sameBytes(bytes, [0, 0, 0, 0])) return '';
  if (bytes[0] === 0) {
    const parts = bytes.slice(1).filter(Boolean).map((c) => HID_LABEL.get(c) ?? `#${c}`);
    return parts.join('+');
  }
  if (bytes[0] === 9) return `M${bytes[2]}`;
  for (const group of Object.values(SPECIAL_ACTIONS)) {
    const hit = group.find(([, value]) => sameBytes(value, bytes));
    if (hit) return hit[0];
  }
  return '?';
}
