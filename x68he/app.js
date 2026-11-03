import {
  X68HE, WebHidTransport, VENDOR_ID, PRODUCT_ID, USAGE_PAGE, USAGE, MODEL_ID, MAG, RT_FLAG, PROFILES, MACRO_SLOTS,
  EFFECTS, EFFECT_OPTIONS, EFFECT_NO_COLOR, EFFECT_NO_SPEED,
} from './protocol.js';
import {
  LAYOUT, KEYS_BY_SLOT, KEY_GROUPS, SPECIAL_ACTIONS, MODIFIER_KEYS, CODE_TO_HID, HID_LABEL,
  DEFAULT_KEY, DEFAULT_FN_WIN, DEFAULT_FN_MAC, describeBinding,
} from './layout.js';

const $ = (id) => document.getElementById(id);
const FILTER = { vendorId: VENDOR_ID, productId: PRODUCT_ID, usagePage: USAGE_PAGE, usage: USAGE };
const FN_BINDING = [10, 1, 0, 0];
const WASD_LABELS = new Set(['W', 'A', 'S', 'D']);
const MODE_LABELS = { 2: 'DKS', 3: 'MT', 4: 'TGL', 5: 'TGL', 7: 'Snap' };

const state = {
  kb: null, device: null, busy: false, tab: 'keys', profile: 0, layer: 'base',
  keys: null, fnWin: null, fnMac: null, mag: null, macros: [],
  selected: new Set(), pickerSlot: null, recording: null,
};

const sameKey = (a, b) => [0, 1, 2, 3].every((i) => a[i] === b[i]);
const mm = (raw) => raw / state.kb.stepsPerMm;
const toRaw = (value) => Math.round(value * state.kb.stepsPerMm);
const clean = (value) => String(Number(value.toFixed(3)));

function toast(message, bad = false) {
  const el = $('toast');
  el.textContent = message;
  el.classList.toggle('bad', bad);
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, bad ? 7000 : 2500);
}

function setStatus(text, bad = false) {
  $('status').textContent = text;
  $('status').classList.toggle('bad', bad);
}

// Writes run one at a time, and a failure is reported instead of being lost.
async function task(label, job) {
  if (state.busy) return undefined;
  state.busy = true;
  document.querySelectorAll('button, select, input').forEach((el) => { if (el.id !== 'connect') el.disabled = true; });
  setStatus(`${label}...`);
  try {
    const result = await job();
    setConnectedStatus();
    return result;
  } catch (error) {
    console.error(error);
    setStatus('Connected, last action failed', true);
    toast(`${label} failed: ${error.message}`, true);
    return undefined;
  } finally {
    state.busy = false;
    document.querySelectorAll('button, select, input').forEach((el) => { el.disabled = false; });
  }
}

function setConnectedStatus() {
  if (state.kb) setStatus(`X68HE connected${state.demo ? ' (demo, no real keyboard)' : ''}`);
}

function renderBoard() {
  const board = $('board');
  board.replaceChildren();
  for (const row of LAYOUT) {
    const rowEl = document.createElement('div');
    rowEl.className = 'board-row';
    for (const key of row) {
      if (key.gap) {
        const gap = document.createElement('div');
        gap.className = 'gap';
        gap.style.width = `calc(var(--unit) * ${key.width})`;
        rowEl.append(gap);
      } else {
        rowEl.append(renderKey(key));
      }
    }
    board.append(rowEl);
  }
}

function renderKey(key) {
  const button = document.createElement('button');
  button.className = 'key';
  button.style.width = `calc(var(--unit) * ${key.width})`;
  const main = document.createElement('span');
  const sub = document.createElement('span');
  sub.className = 'sub';
  button.append(main, sub);

  if (state.tab === 'travel' && state.mag) {
    const mode = state.mag[MAG.modes][key.slot];
    main.textContent = key.label;
    sub.textContent = MODE_LABELS[mode & 0x7f] ?? `${clean(mm(state.mag[MAG.travel][key.slot]))}${mode & RT_FLAG ? ' RT' : ''}`;
    button.classList.toggle('selected', state.selected.has(key.slot));
    button.setAttribute('aria-pressed', state.selected.has(key.slot));
    button.addEventListener('click', () => toggleSelected(key.slot));
    return button;
  }

  const binding = currentBinding(key.slot);
  const fallback = layerDefault(key.slot);
  const text = describeBinding(binding);
  if (state.layer === 'base') {
    const untouched = sameKey(binding, fallback);
    main.textContent = untouched ? key.label : text || 'Off';
    if (!untouched) sub.textContent = key.label;
    button.classList.toggle('disabled-binding', !text);
  } else {
    main.textContent = key.label;
    sub.textContent = text;
  }
  button.classList.toggle('changed', !sameKey(binding, fallback));
  button.classList.toggle('selected', state.pickerSlot === key.slot);
  button.addEventListener('click', () => openPicker(key));
  return button;
}

function layerTable() {
  if (state.layer === 'base') return state.keys;
  return state.layer === 'win' ? state.fnWin : state.fnMac;
}
const currentBinding = (slot) => [...layerTable().slice(slot * 4, slot * 4 + 4)];
function layerDefault(slot) {
  if (state.layer === 'base') return DEFAULT_KEY(slot);
  return (state.layer === 'win' ? DEFAULT_FN_WIN : DEFAULT_FN_MAC).slice(slot * 4, slot * 4 + 4);
}

function toggleSelected(slot) {
  if (state.selected.has(slot)) state.selected.delete(slot);
  else state.selected.add(slot);
  fillTravelFields();
  renderBoard();
}

function openPicker(key) {
  state.pickerSlot = key.slot;
  $('picker').hidden = false;
  $('picker-title').textContent = `${key.label}: ${describeBinding(currentBinding(key.slot)) || 'disabled'}`;
  renderBoard();
}

function closePicker() {
  state.pickerSlot = null;
  $('picker').hidden = true;
  renderBoard();
}

function buildPicker() {
  const chord = $('chord');
  for (const [label, hid] of MODIFIER_KEYS) {
    const wrap = document.createElement('label');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.dataset.mod = hid;
    wrap.append(box, label.slice(1));
    chord.append(wrap);
  }
  const groups = $('picker-groups');
  const addGroup = (title, items) => {
    const group = document.createElement('div');
    group.className = 'group';
    const heading = document.createElement('h3');
    heading.textContent = title;
    const list = document.createElement('div');
    for (const [label, action] of items) {
      const button = document.createElement('button');
      button.textContent = label;
      button.addEventListener('click', action);
      list.append(button);
    }
    group.append(heading, list);
    groups.append(group);
  };
  for (const [title, keys] of Object.entries(KEY_GROUPS)) {
    addGroup(title, keys.map(([label, hid]) => [label, () => bindKey(hid)]));
  }
  for (const [title, actions] of Object.entries(SPECIAL_ACTIONS)) {
    addGroup(title, actions.map(([label, value]) => [label, () => assign(value)]));
  }
  addGroup('Macro: runs once per repeat setting', Array.from({ length: MACRO_SLOTS }, (_, slot) => [`M${slot}`, () => assign([9, 0, slot, 0])]));
  addGroup('Macro: repeats while held', Array.from({ length: MACRO_SLOTS }, (_, slot) => [`M${slot}`, () => assign([9, 2, slot, 0])]));
  addGroup('Macro: press to start and stop', Array.from({ length: MACRO_SLOTS }, (_, slot) => [`M${slot}`, () => assign([9, 1, slot, 0])]));
}

function bindKey(hid) {
  const mods = [...document.querySelectorAll('#chord input:checked')].map((box) => Number(box.dataset.mod));
  if (mods.length > 2) {
    toast('A key can hold at most two modifiers', true);
    return;
  }
  if (mods.length === 2) assign([0, mods[0], mods[1], hid]);
  else if (mods.length === 1) assign([0, 0, mods[0], hid]);
  else assign([0, 0, hid, 0]);
}

function countFnKeys(slotBeingChanged) {
  let count = 0;
  for (const slot of KEYS_BY_SLOT.keys()) {
    if (slot !== slotBeingChanged && sameKey([...state.keys.slice(slot * 4, slot * 4 + 4)], FN_BINDING)) count++;
  }
  return count;
}

async function assign(value) {
  const slot = state.pickerSlot;
  if (slot === null) return;
  if (value[0] === 9 && state.macros[value[2]].empty) {
    toast(`M${value[2]} is empty. Record it on the Macros tab first.`, true);
    return;
  }
  const isFnKey = sameKey(currentBinding(slot), FN_BINDING);
  if (state.layer === 'base' && isFnKey && !sameKey(value, FN_BINDING) && countFnKeys(slot) === 0
    && !confirm('This is your only Fn key. Without one, the Fn layer and its shortcuts are unreachable. Continue?')) return;
  const layer = state.layer;
  const done = await task('Saving key', async () => {
    if (layer === 'base') await state.kb.setKey(state.profile, slot, value);
    else await state.kb.setFnKey(layer, slot, value);
    layerTable().set(value, slot * 4);
    return true;
  });
  if (done) {
    document.querySelectorAll('#chord input').forEach((box) => { box.checked = false; });
    closePicker();
    toast('Key saved');
  }
}

function selectKeys(which) {
  state.selected.clear();
  for (const [slot, key] of KEYS_BY_SLOT) {
    if (which === 'all' || (which === 'wasd' && WASD_LABELS.has(key.label))) state.selected.add(slot);
  }
  fillTravelFields();
  renderBoard();
}

const TRAVEL_FIELDS = [['t-travel', MAG.travel], ['t-lift', MAG.lift], ['t-rtp', MAG.rtPress], ['t-rtl', MAG.rtLift], ['t-dead', MAG.deadzone], ['t-top', MAG.topDeadzone]];

// A field shows a value only when every selected key agrees, so a blank means "mixed".
function fillTravelFields() {
  const slots = [...state.selected];
  const shared = (read) => {
    if (!slots.length) return '';
    const first = read(slots[0]);
    return slots.every((slot) => read(slot) === first) ? first : '';
  };
  for (const [id, op] of TRAVEL_FIELDS) {
    const value = shared((slot) => state.mag[op][slot]);
    $(id).value = value === '' ? '' : clean(mm(value));
  }
  const rt = shared((slot) => (state.mag[MAG.modes][slot] & RT_FLAG) !== 0);
  $('t-rt').indeterminate = rt === '';
  $('t-rt').checked = rt === true;
  $('travel-hint').textContent = slots.length ? `${slots.length} key${slots.length > 1 ? 's' : ''} selected` : 'Click keys to select them.';
}

function validField(id) {
  const input = $(id);
  if (input.value === '') return null;
  const value = Number(input.value);
  if (!input.checkValidity() || Number.isNaN(value)) throw new Error(`${input.parentElement.firstChild.textContent.trim()} is out of range`);
  return value;
}

async function applyTravel() {
  const slots = [...state.selected];
  if (!slots.length) {
    toast('Select some keys first', true);
    return;
  }
  const changes = {};
  try {
    for (const [id, op] of TRAVEL_FIELDS) {
      const value = validField(id);
      if (value === null) continue;
      const table = [...state.mag[op]];
      for (const slot of slots) table[slot] = toRaw(value);
      if (table.some((v, i) => v !== state.mag[op][i])) changes[op] = table;
    }
  } catch (error) {
    toast(error.message, true);
    return;
  }
  if (!$('t-rt').indeterminate) {
    const modes = [...state.mag[MAG.modes]];
    for (const slot of slots) modes[slot] = $('t-rt').checked ? modes[slot] | RT_FLAG : modes[slot] & ~RT_FLAG;
    if (modes.some((v, i) => v !== state.mag[MAG.modes][i])) changes[MAG.modes] = modes;
  }
  if (!Object.keys(changes).length) {
    toast('Nothing to change');
    return;
  }
  const done = await task('Saving actuation', async () => {
    await state.kb.writeMagnetism(changes);
    state.mag = await state.kb.getMagnetism();
    return true;
  });
  if (done) {
    fillTravelFields();
    renderBoard();
    toast('Actuation saved');
  }
}

function syncLightControls() {
  const effect = Number($('l-effect').value);
  const options = EFFECT_OPTIONS[effect] ?? [];
  const select = $('l-option');
  const previous = select.value;
  select.replaceChildren(...options.map((label, index) => new Option(label, index)));
  if (options.length) select.value = Number(previous) < options.length ? Number(previous) : 0;
  $('l-option-wrap').hidden = !options.length;
  $('l-speed-wrap').hidden = EFFECT_NO_SPEED.has(effect);
  const colour = !EFFECT_NO_COLOR.has(effect);
  $('l-rainbow-wrap').hidden = !colour;
  $('l-color-wrap').hidden = !colour || $('l-rainbow').checked;
}

function fillLight(led) {
  const select = $('l-effect');
  const offered = Object.keys(EFFECT_OPTIONS).map(Number);
  select.replaceChildren(...offered.map((id) => new Option(EFFECTS[id], id)));
  const known = offered.includes(led.effect);
  $('l-note').hidden = known;
  if (known) {
    select.value = led.effect;
  } else {
    $('l-note').textContent = `The keyboard is using "${EFFECTS[led.effect] ?? `effect ${led.effect}`}", which needs the vendor driver. Applying here replaces it.`;
  }
  $('l-option').value = led.option;
  $('l-bright').value = led.brightness;
  $('l-speed').value = led.speed;
  $('l-rainbow').checked = led.rainbow;
  $('l-color').value = `#${led.rgb.toString(16).padStart(6, '0')}`;
  syncLightControls();
  $('l-option').value = led.option;
}

async function applyLight() {
  const led = {
    effect: Number($('l-effect').value), speed: Number($('l-speed').value), brightness: Number($('l-bright').value),
    option: Number($('l-option').value) || 0, rainbow: $('l-rainbow').checked,
    rgb: parseInt($('l-color').value.slice(1), 16),
  };
  if (await task('Saving lighting', async () => { await state.kb.setLed(led); return true; })) toast('Lighting saved');
}

function macroLine({ code, down, delay, mouseMove }) {
  if (mouseMove) return 'mouse movement (kept only until replaced)';
  return `${HID_LABEL.get(code) ?? `code ${code}`} ${down ? 'down' : 'up'}, wait ${delay} ms`;
}

function renderMacro() {
  const macro = state.recording ?? state.macros[Number($('m-slot').value)];
  $('m-events').replaceChildren(...(macro?.events ?? []).map((event) => {
    const item = document.createElement('li');
    item.textContent = macroLine(event);
    return item;
  }));
  if (!state.recording && macro && !macro.empty) $('m-repeat').value = macro.repeat || 1;
}

function fillMacroSlots() {
  const select = $('m-slot');
  const current = select.value || '0';
  select.replaceChildren(...state.macros.map((macro, slot) => new Option(`M${slot}${macro.empty ? '' : ` (${macro.events.length} events)`}`, slot)));
  select.value = current;
}

function onRecordKey(event) {
  if (!state.recording || event.repeat) return;
  event.preventDefault();
  const code = CODE_TO_HID.get(event.code);
  if (code === undefined) return;
  const now = performance.now();
  const events = state.recording.events;
  if (events.length) events[events.length - 1].delay = Math.round(now - state.recording.last);
  events.push({ code, down: event.type === 'keydown', delay: 20 });
  state.recording.last = now;
  renderMacro();
}

function toggleRecording() {
  const button = $('m-record');
  if (state.recording) {
    const { events } = state.recording;
    state.draft = { repeat: 1, events };
    state.recording = null;
    window.removeEventListener('keydown', onRecordKey, true);
    window.removeEventListener('keyup', onRecordKey, true);
    button.textContent = 'Record';
    button.classList.remove('recording');
    button.blur();
    $('m-events').replaceChildren(...events.map((event) => {
      const item = document.createElement('li');
      item.textContent = macroLine(event);
      return item;
    }));
    return;
  }
  state.draft = null;
  state.recording = { events: [], last: 0 };
  window.addEventListener('keydown', onRecordKey, true);
  window.addEventListener('keyup', onRecordKey, true);
  button.textContent = 'Stop';
  button.classList.add('recording');
  button.blur();
  renderMacro();
}

async function saveMacro() {
  if (state.recording) toggleRecording();
  if (!state.draft?.events.length) {
    toast('Record something first', true);
    return;
  }
  const slot = Number($('m-slot').value);
  const old = state.macros[slot];
  if (!old.empty && !confirm(`Replace the ${old.events.length} events in M${slot}?`)) return;
  const macro = { repeat: Number($('m-repeat').value) || 1, events: state.draft.events };
  const done = await task('Saving macro', async () => {
    await state.kb.setMacro(slot, macro);
    state.macros[slot] = await state.kb.getMacro(slot);
    return true;
  });
  if (done) {
    state.draft = null;
    fillMacroSlots();
    renderMacro();
    toast(`Saved to M${slot}`);
  }
}

async function setOption(change) {
  await task('Saving setting', async () => {
    await state.kb.setOptions({ ...(await state.kb.getOptions()), ...change });
  });
}

function toHex(bytes) { return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(''); }
function fromHex(text) { return Uint8Array.from(text.match(/../g) ?? [], (pair) => parseInt(pair, 16)); }

async function readBackup() {
  const { kb } = state;
  const backup = { format: 'x68he-backup-1', created: new Date().toISOString(), firmware: state.firmware };
  backup.led = (await kb.getLed()).raw;
  backup.reportRate = await kb.getReportRate();
  backup.options = await kb.getOptions();
  backup.autoOs = await kb.getAutoOs();
  backup.fnWin = toHex(await kb.getFnKeys('win'));
  backup.fnMac = toHex(await kb.getFnKeys('mac'));
  backup.macros = [];
  for (let slot = 0; slot < MACRO_SLOTS; slot++) backup.macros.push(toHex(await kb.getMacroBytes(slot)));
  backup.profiles = [];
  const active = await kb.getProfile();
  try {
    for (let profile = 0; profile < PROFILES; profile++) {
      await kb.setProfile(profile);
      backup.profiles.push({ keys: toHex(await kb.getKeys(profile)), magnetism: await kb.getMagnetism() });
    }
  } finally {
    await kb.setProfile(active);
  }
  return backup;
}

async function downloadBackup() {
  const backup = await task('Reading keyboard', readBackup);
  if (!backup) return;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 1)], { type: 'application/json' }));
  link.download = `x68he-backup-${backup.created.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function writeBackup(backup) {
  const { kb } = state;
  const active = await kb.getProfile();
  try {
    for (let profile = 0; profile < PROFILES; profile++) {
      const saved = backup.profiles[profile];
      await kb.setProfile(profile);
      const wanted = fromHex(saved.keys);
      const now = await kb.getKeys(profile);
      for (let slot = 0; slot < 128; slot++) {
        const value = [...wanted.slice(slot * 4, slot * 4 + 4)];
        if (!sameKey(value, now.slice(slot * 4, slot * 4 + 4))) await kb.setKey(profile, slot, value);
      }
      const current = await kb.getMagnetism();
      const tables = {};
      for (const op of Object.values(MAG)) {
        if (JSON.stringify(saved.magnetism[op]) !== JSON.stringify(current[op])) tables[op] = saved.magnetism[op];
      }
      await kb.writeMagnetism(tables);
    }
  } finally {
    await kb.setProfile(active);
  }
  for (const [os, saved] of [['win', backup.fnWin], ['mac', backup.fnMac]]) {
    const wanted = fromHex(saved);
    const now = await kb.getFnKeys(os);
    for (let slot = 0; slot < 128; slot++) {
      const value = [...wanted.slice(slot * 4, slot * 4 + 4)];
      if (!sameKey(value, now.slice(slot * 4, slot * 4 + 4))) await kb.setFnKey(os, slot, value);
    }
  }
  for (const [slot, saved] of backup.macros.entries()) {
    const wanted = fromHex(saved);
    if (toHex(await kb.getMacroBytes(slot)) === saved || wanted[0] === 255) continue;
    const padded = new Uint8Array(256);
    padded.set(wanted.slice(0, 256));
    await kb.setMacroBytes(slot, padded);
  }
  await kb.setLedRaw(backup.led);
  await kb.setOptions(backup.options);
  await kb.setAutoOs(backup.autoOs);
  await kb.setReportRate(backup.reportRate);
}

async function restoreBackup(file) {
  let backup;
  try {
    backup = JSON.parse(await file.text());
    if (backup.format !== 'x68he-backup-1' || backup.profiles?.length !== PROFILES) throw new Error();
  } catch {
    toast('That file is not an X68HE backup', true);
    return;
  }
  if (!confirm(`Replace the keyboard's settings with the backup from ${backup.created.slice(0, 10)}?`)) return;
  const done = await task('Restoring backup', async () => { await writeBackup(backup); return true; });
  if (done) {
    await loadAll();
    toast('Backup restored');
  }
}

async function loadProfile() {
  const { kb } = state;
  state.keys = await kb.getKeys(state.profile);
  state.mag = await kb.getMagnetism();
  $('profile').value = state.profile;
}

async function loadAll() {
  await task('Reading keyboard', async () => {
    const { kb } = state;
    state.profile = await kb.getProfile();
    await loadProfile();
    state.fnWin = await kb.getFnKeys('win');
    state.fnMac = await kb.getFnKeys('mac');
    state.macros = [];
    for (let slot = 0; slot < MACRO_SLOTS; slot++) state.macros.push(await kb.getMacro(slot));
    const options = await kb.getOptions();
    $('d-rate').value = await kb.getReportRate();
    $('d-os').value = options.os === 'mac' ? 'mac' : 'win';
    $('d-stab').value = options.rtStabilityMs;
    $('d-wasd').checked = options.wasdSwap;
    $('d-anti').checked = options.antiMisfire;
    $('d-auto').checked = await kb.getAutoOs();
    fillLight(await kb.getLed());
    fillMacroSlots();
    $('d-firmware').textContent = `Firmware ${state.firmware}, model ${MODEL_ID}.`;
  });
  fillTravelFields();
  renderMacro();
  renderBoard();
}

function selectTab(tab) {
  state.tab = tab;
  document.querySelectorAll('nav button').forEach((button) => button.setAttribute('aria-selected', button.dataset.tab === tab));
  document.querySelectorAll('.tab').forEach((section) => { section.hidden = section.id !== `tab-${tab}`; });
  $('board-area').hidden = tab !== 'keys' && tab !== 'travel';
  if (state.pickerSlot !== null) closePicker();
  if (state.keys) {
    fillTravelFields();
    renderBoard();
  }
}

async function start(transport, demo = false) {
  state.demo = demo;
  const kb = new X68HE(transport);
  const { id, version, supported } = await kb.identify();
  if (!supported) {
    setStatus(`Unexpected keyboard model ${id}`, true);
    toast(`This page only supports model ${MODEL_ID}. Nothing was changed.`, true);
    return;
  }
  state.kb = kb;
  state.firmware = `${version >> 8}.${String(version & 255).padStart(2, '0')}`;
  $('welcome').hidden = true;
  $('app').hidden = false;
  $('profile-picker').hidden = false;
  $('connect').hidden = true;
  selectTab('keys');
  await loadAll();
}

async function openDevice(device) {
  state.device = device;
  if (!device.opened) await device.open();
  await start(new WebHidTransport(device));
}

function explainOpenFailure(error) {
  console.error(error);
  setStatus('Could not open the keyboard', true);
  $('linux-help').open = true;
  toast(`Could not open the keyboard: ${error.message}`, true);
}

async function connect() {
  try {
    const [device] = await navigator.hid.requestDevice({ filters: [FILTER] });
    if (device) await openDevice(device);
  } catch (error) {
    explainOpenFailure(error);
  }
}

function onDisconnect(event) {
  if (event.device !== state.device) return;
  state.kb = null;
  state.device = null;
  state.keys = null;
  $('app').hidden = true;
  $('profile-picker').hidden = true;
  $('welcome').hidden = false;
  $('connect').hidden = false;
  setStatus('Keyboard disconnected', true);
}

function wire() {
  buildPicker();
  $('connect').addEventListener('click', connect);
  document.querySelectorAll('nav button').forEach((button) => button.addEventListener('click', () => selectTab(button.dataset.tab)));
  document.querySelectorAll('[data-select]').forEach((button) => button.addEventListener('click', () => selectKeys(button.dataset.select)));
  $('layer').addEventListener('change', (event) => {
    state.layer = event.target.value;
    closePicker();
  });
  $('profile').addEventListener('change', async (event) => {
    const profile = Number(event.target.value);
    await task('Switching profile', async () => {
      await state.kb.setProfile(profile);
      state.profile = profile;
      await loadProfile();
    });
    $('profile').value = state.profile;
    state.selected.clear();
    closePicker();
    fillTravelFields();
  });
  $('key-default').addEventListener('click', () => assign(layerDefault(state.pickerSlot)));
  $('key-disable').addEventListener('click', () => assign([0, 0, 0, 0]));
  $('key-close').addEventListener('click', closePicker);
  $('t-apply').addEventListener('click', applyTravel);
  $('l-effect').addEventListener('change', syncLightControls);
  $('l-rainbow').addEventListener('change', syncLightControls);
  $('l-apply').addEventListener('click', applyLight);
  $('m-record').addEventListener('click', toggleRecording);
  $('m-save').addEventListener('click', saveMacro);
  $('m-slot').addEventListener('change', () => { state.draft = null; renderMacro(); });
  $('d-rate').addEventListener('change', (event) => task('Saving polling rate', () => state.kb.setReportRate(Number(event.target.value))));
  $('d-os').addEventListener('change', (event) => setOption({ os: event.target.value }));
  $('d-stab').addEventListener('change', (event) => setOption({ rtStabilityMs: Number(event.target.value) }));
  $('d-wasd').addEventListener('change', (event) => setOption({ wasdSwap: event.target.checked }));
  $('d-anti').addEventListener('change', (event) => setOption({ antiMisfire: event.target.checked }));
  $('d-auto').addEventListener('change', (event) => task('Saving setting', () => state.kb.setAutoOs(event.target.checked)));
  $('b-save').addEventListener('click', downloadBackup);
  $('b-load').addEventListener('change', (event) => {
    const [file] = event.target.files;
    event.target.value = '';
    if (file) restoreBackup(file);
  });
}

async function boot() {
  wire();
  const params = new URLSearchParams(location.search);
  if (params.has('demo')) {
    const { SimulatedKeyboard } = await import('./simulator.js');
    await start(new SimulatedKeyboard(), true);
    return;
  }
  if (!('hid' in navigator)) {
    $('unsupported').hidden = false;
    $('connect').disabled = true;
    return;
  }
  navigator.hid.addEventListener('disconnect', onDisconnect);
  try {
    const [known] = await navigator.hid.getDevices();
    if (known) await openDevice(known);
  } catch (error) {
    explainOpenFailure(error);
  }
}

boot();
