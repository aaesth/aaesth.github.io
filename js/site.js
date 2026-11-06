// everything interactive on aesth.cc. each part only runs if its element is on the page.
const SITE = window.SITE || {};
if (SITE.api) SITE.api = SITE.api.replace(/\/+$/, ""); // tolerate a trailing slash
const $ = (id) => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function ago(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  const units = [["y", 31536000], ["mo", 2592000], ["d", 86400], ["h", 3600], ["m", 60]];
  for (const [u, n] of units) if (s >= n) return Math.floor(s / n) + u + " ago";
  return "just now";
}

function elapsed(start) {
  const s = Math.max(0, Math.floor((Date.now() - start) / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return (h ? h + ":" + pad(m) : m) + ":" + pad(sec) + " elapsed";
}

// GitHub allows 60 unauthenticated requests an hour, so keep answers for 10 minutes
async function cachedJSON(url, minutes = 10) {
  const key = "c:" + url;
  try {
    const hit = JSON.parse(sessionStorage.getItem(key) || "null");
    if (hit && Date.now() - hit.t < minutes * 60000) return hit.d;
  } catch (e) {}
  const r = await fetch(url);
  if (!r.ok) throw new Error(r.status);
  const d = await r.json();
  try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d })); } catch (e) {}
  return d;
}

/* ---- wavy heading ---- */
document.querySelectorAll("[data-wave]").forEach((h) => {
  const text = h.textContent;
  h.textContent = "";
  h.setAttribute("aria-label", text);
  [...text].forEach((ch, i) => {
    const s = el("span", null, ch);
    s.style.setProperty("--i", i);
    s.setAttribute("aria-hidden", "true");
    h.appendChild(s);
  });
});

/* ---- message of the day ---- */
(function motd() {
  const box = $("motd");
  if (!box) return;
  let lines = [];
  const pick = () => {
    if (!lines.length) return;
    let next;
    do { next = lines[Math.floor(Math.random() * lines.length)]; } while (lines.length > 1 && next === box.textContent);
    box.textContent = next;
  };
  fetch("/assets/motd.txt")
    .then((r) => r.text())
    .then((data) => {
      lines = data.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length) pick(); else box.textContent = "nothing today";
    })
    .catch(() => { box.textContent = "error loading motd"; });
  const again = $("motd-again");
  if (again) again.addEventListener("click", pick);
})();

/* ---- theme switcher ---- */
(function themes() {
  const box = $("themes");
  if (!box || !window.THEMES) return;
  for (const [name, colors] of Object.entries(window.THEMES)) {
    const b = el("button", "swatch");
    b.type = "button";
    b.title = name;
    b.setAttribute("aria-label", name + " theme");
    b.style.setProperty("--c", colors[0]);
    b.addEventListener("click", () => {
      window.applyTheme(name);
      try { localStorage.setItem("theme", name); } catch (e) {}
      mark();
    });
    box.appendChild(b);
  }
  function mark() {
    [...box.children].forEach((b) => b.classList.toggle("on", b.title === document.documentElement.dataset.theme));
  }
  mark();
})();

/* ---- last updated (newest commit) ---- */
(function updated() {
  const box = $("updated");
  if (!box || !SITE.repo) return;
  cachedJSON(`https://api.github.com/repos/${SITE.repo}/commits?per_page=1`)
    .then((c) => {
      const date = c[0].commit.committer.date;
      box.textContent = "updated " + ago(date);
      box.title = new Date(date).toLocaleString();
    })
    .catch(() => {});
})();

/* ---- recently updated repos ---- */
(function repos() {
  const panel = $("repos"), list = $("repo-list");
  if (!panel || !SITE.github) return;
  cachedJSON(`https://api.github.com/users/${SITE.github}/repos?sort=pushed&per_page=20`)
    .then((all) => {
      const own = all.filter((r) => !r.fork && r.name.toLowerCase() !== `${SITE.github}.github.io`.toLowerCase()).slice(0, 5);
      if (!own.length) return;
      for (const r of own) {
        const a = el("a", "line");
        a.href = r.html_url;
        const info = el("span", "info");
        info.append(el("b", null, r.name), el("span", "dim", r.description || "no description"));
        const side = el("span", "side dim", ago(r.pushed_at));
        if (r.language) side.prepend(el("span", "tag", r.language), document.createElement("br"));
        a.append(info, side);
        const li = el("li");
        li.appendChild(a);
        list.appendChild(li);
      }
      panel.hidden = false;
    })
    .catch(() => {});
})();

/* ---- discord status via lanyard ---- */
(function presence() {
  const panel = $("presence"), body = $("presence-body");
  if (!panel || !SITE.discordId) return;
  const words = { online: "online", idle: "idle", dnd: "do not disturb", offline: "offline" };
  let timer;

  function assetURL(appId, img) {
    if (!img) return null;
    if (img.startsWith("mp:")) return "https://media.discordapp.net/" + img.slice(3);
    if (img.startsWith("spotify:")) return "https://i.scdn.co/image/" + img.slice(8);
    return `https://cdn.discordapp.com/app-assets/${appId}/${img}.png`;
  }

  function render(d) {
    body.textContent = "";
    clearInterval(timer);
    const u = d.discord_user;

    const who = el("div", "who");
    if (u.avatar) {
      const av = el("img", "avatar");
      av.src = `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64`;
      av.alt = "";
      who.appendChild(av);
    }
    const name = el("span", "info");
    name.append(el("b", null, u.global_name || u.username));
    const st = el("span", "status " + d.discord_status, words[d.discord_status] || d.discord_status);
    name.appendChild(st);
    who.appendChild(name);
    body.appendChild(who);

    const custom = d.activities.find((a) => a.type === 4);
    if (custom && custom.state) body.appendChild(el("p", "note", custom.state));

    const acts = d.activities.filter((a) => a.type !== 4);
    for (const a of acts) {
      const row = el("div", "activity");
      const spotify = a.name === "Spotify" && d.spotify;
      const img = spotify ? d.spotify.album_art_url : assetURL(a.application_id, a.assets && a.assets.large_image);
      if (img) {
        const i = el("img", "art");
        i.src = img;
        i.alt = "";
        row.appendChild(i);
      }
      const info = el("span", "info");
      const verb = ["playing", "streaming", "listening to", "watching", "", "competing in"][a.type] || "";
      info.appendChild(el("span", "dim", verb));
      if (spotify) {
        info.append(el("b", null, d.spotify.song), el("span", "dim", "by " + d.spotify.artist));
      } else {
        info.appendChild(el("b", null, a.name));
        if (a.details) info.appendChild(el("span", "dim", a.details));
        if (a.state) info.appendChild(el("span", "dim", a.state));
      }
      if (a.timestamps && a.timestamps.start) {
        const t = el("span", "off", elapsed(a.timestamps.start));
        info.appendChild(t);
        timer = setInterval(() => { t.textContent = elapsed(a.timestamps.start); }, 1000);
      }
      row.appendChild(info);
      body.appendChild(row);
    }
    if (!acts.length && !custom) body.appendChild(el("p", "dim", "not doing anything right now"));
    panel.hidden = false;
  }

  function load() {
    fetch(`https://api.lanyard.rest/v1/users/${SITE.discordId}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) render(j.data); })
      .catch(() => {});
  }
  load();
  setInterval(load, 30000);
})();

/* ---- last.fm recent tracks ---- */
(function lastfm() {
  const panel = $("lastfm"), list = $("lastfm-list");
  if (!panel || !SITE.lastfmUser || !SITE.lastfmKey) return;
  const pickImage = (imgs) => {
    const url = ((imgs || []).find((i) => i.size === "medium") || {})["#text"];
    // last.fm returns this grey star image when a track has no art
    return url && !url.includes("2a96cbd8b46e442fc41c2b86b821562f") ? url : null;
  };
  function load() {
    const q = new URLSearchParams({ method: "user.getrecenttracks", user: SITE.lastfmUser, api_key: SITE.lastfmKey, format: "json", limit: "5" });
    fetch("https://ws.audioscrobbler.com/2.0/?" + q)
      .then((r) => r.json())
      .then((j) => {
        const tracks = (j.recenttracks && j.recenttracks.track) || [];
        if (!tracks.length) return;
        list.textContent = "";
        for (const t of tracks.slice(0, 5)) {
          const playing = t["@attr"] && t["@attr"].nowplaying === "true";
          const a = el("a", "line track" + (playing ? " playing" : ""));
          a.href = t.url;
          const img = pickImage(t.image);
          const art = el(img ? "img" : "span", "cover");
          if (img) { art.src = img; art.alt = ""; art.loading = "lazy"; }
          const info = el("span", "info");
          info.append(el("b", null, t.name), el("span", "dim", t.artist["#text"]));
          const side = el("span", "side dim", playing ? "now" : t.date ? ago(Number(t.date.uts) * 1000) : "");
          if (playing) { side.className = "side eq"; side.textContent = ""; side.title = "playing now"; }
          a.append(art, info, side);
          const li = el("li");
          li.appendChild(a);
          list.appendChild(li);
        }
        panel.hidden = false;
      })
      .catch(() => {});
  }
  load();
  setInterval(load, 60000);
})();

/* ---- public files page: lists a github repo as a folder tree ---- */
(function files() {
  const box = $("files");
  if (!box || !SITE.filesRepo) return;
  const repo = SITE.filesRepo, branch = SITE.filesBranch || "main";
  const size = (n) => {
    const u = ["B", "KB", "MB", "GB"];
    let i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return (i ? n.toFixed(1) : n) + " " + u[i];
  };
  const enc = (p) => p.split("/").map(encodeURIComponent).join("/");

  Promise.all([
    cachedJSON(`https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`),
    cachedJSON(`https://api.github.com/repos/${repo}/commits?per_page=1`).catch(() => null),
  ])
    .then(([tree, commits]) => {
      // build nested folders from the flat path list
      const root = { dirs: {}, files: [] };
      let total = 0, bytes = 0;
      for (const t of tree.tree) {
        const parts = t.path.split("/");
        let node = root;
        for (const dir of parts.slice(0, t.type === "tree" ? parts.length : -1)) {
          node = node.dirs[dir] = node.dirs[dir] || { dirs: {}, files: [] };
        }
        if (t.type === "blob") { node.files.push({ name: parts[parts.length - 1], path: t.path, size: t.size }); total++; bytes += t.size; }
      }

      function folderSize(node) {
        return node.files.reduce((s, f) => s + f.size, 0) + Object.values(node.dirs).reduce((s, d) => s + folderSize(d), 0);
      }

      function render(node, parent) {
        const byName = (a, b) => a.localeCompare(b, undefined, { numeric: true });
        for (const name of Object.keys(node.dirs).sort(byName)) {
          const d = node.dirs[name];
          const det = el("details", "folder");
          const sum = el("summary", "line");
          const info = el("span", "info");
          info.appendChild(el("b", null, name + "/"));
          sum.append(el("span", "icon dir"), info, el("span", "side dim", size(folderSize(d))));
          det.appendChild(sum);
          const kids = el("div", "kids");
          render(d, kids);
          det.appendChild(kids);
          parent.appendChild(det);
        }
        for (const f of node.files.sort((a, b) => byName(a.name, b.name))) {
          const row = el("div", "line file");
          const info = el("span", "info");
          const view = el("a", null, f.name);
          view.href = `https://github.com/${repo}/blob/${branch}/${enc(f.path)}`;
          info.appendChild(view);
          const dl = el("a", "btn small", "download");
          dl.href = `https://github.com/${repo}/raw/${branch}/${enc(f.path)}`;
          dl.setAttribute("download", f.name);
          dl.dataset.safe = "";
          row.append(el("span", "icon"), info, el("span", "side dim", size(f.size)), dl);
          parent.appendChild(row);
        }
      }

      box.textContent = "";
      render(root, box);
      $("files-count").textContent = total + " files · " + size(bytes);
      if (commits && commits[0]) {
        const date = commits[0].commit.committer.date;
        const u = $("files-updated");
        u.textContent = "last change " + ago(date) + ": " + commits[0].commit.message.split("\n")[0];
        u.title = new Date(date).toLocaleString();
      }
    })
    .catch(() => { box.textContent = ""; box.appendChild(el("p", "dim empty", "couldnt load the file list, github might be rate limiting, try again later")); });
})();

/* ---- visitor counter ---- */
(function counter() {
  const box = $("counter");
  if (!box || !SITE.api) return;
  let first = false;
  try { first = !sessionStorage.getItem("counted"); } catch (e) {}
  fetch(SITE.api + (first ? "/hit" : "/count"), { method: first ? "POST" : "GET" })
    .then((r) => r.json())
    .then((j) => {
      if (typeof j.count !== "number") return;
      try { sessionStorage.setItem("counted", "1"); } catch (e) {}
      const digits = String(j.count).padStart(6, "0");
      box.setAttribute("aria-label", j.count + " visitors");
      for (const ch of digits) {
        const slot = el("span", "digit");
        const reel = el("span", "reel");
        for (let i = 0; i <= 9; i++) reel.appendChild(el("span", null, String(i)));
        slot.appendChild(reel);
        box.appendChild(slot);
        requestAnimationFrame(() => requestAnimationFrame(() => reel.style.setProperty("--d", ch)));
      }
      box.parentElement.hidden = false;
    })
    .catch(() => {});
})();

/* ---- guestbook ---- */
(function guestbook() {
  const form = $("note-form"), wall = $("wall");
  if (!form || !wall) return;
  const status = $("note-status"), more = $("wall-more"), left = $("note-left"), count = $("wall-count");
  const text = $("note-body");

  if (!SITE.api) {
    status.textContent = "the guestbook isnt set up yet";
    status.hidden = false;
    form.querySelectorAll("textarea, input, button").forEach((x) => (x.disabled = true));
    $("wall-empty").hidden = false;
    return;
  }

  text.addEventListener("input", () => { left.textContent = 500 - text.value.length + " characters left"; });

  let page = 0;
  function load(reset) {
    if (reset) { page = 0; wall.textContent = ""; }
    fetch(`${SITE.api}/notes?page=${page}`)
      .then((r) => r.json())
      .then((j) => {
        for (const n of j.notes) {
          const li = el("li", "post");
          const meta = el("div", "meta");
          meta.append(el("b", null, n.name), el("span", "off", ago(n.at)));
          meta.lastChild.title = new Date(n.at).toLocaleString();
          li.append(meta, el("p", "text", n.body));
          wall.appendChild(li);
        }
        count.textContent = j.total || "";
        $("wall-empty").hidden = j.total > 0;
        more.hidden = !j.more;
        page++;
      })
      .catch(() => { $("wall-empty").textContent = "couldnt load notes"; $("wall-empty").hidden = false; });
  }
  more.addEventListener("click", () => load(false));
  load(true);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const body = text.value.trim();
    if (!body) return;
    const send = $("note-send");
    send.disabled = true;
    fetch(SITE.api + "/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, name: $("note-handle").value, hp: form.elements.hp.value }),
    })
      .then((r) => r.json())
      .then((j) => {
        status.hidden = false;
        if (j.ok) {
          status.className = "note good";
          status.textContent = "thanks, your note is up";
          text.value = "";
          left.textContent = "500 characters left";
          load(true);
        } else {
          status.className = "note bad";
          status.textContent = j.error || "something went wrong";
        }
      })
      .catch(() => {
        status.hidden = false;
        status.className = "note bad";
        status.textContent = "couldnt reach the server";
      })
      .finally(() => { send.disabled = false; });
  });
})();

/* ---- "you are leaving" dialog for outside links ---- */
(function leaving() {
  const safe = SITE.safeHosts || [location.hostname];
  let dialog, target;
  function build() {
    dialog = el("dialog", "panel leave");
    dialog.innerHTML =
      '<div class="head">Leaving aesth.cc</div>' +
      '<div class="body"><p>this link goes to another site:</p><p class="url mono"></p>' +
      '<div class="row"><button class="btn" type="button" data-x>stay</button>' +
      '<a class="btn primary" target="_blank" rel="noopener noreferrer">continue</a></div></div>';
    document.body.appendChild(dialog);
    dialog.querySelector("[data-x]").addEventListener("click", () => dialog.close());
    dialog.querySelector("a.btn").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (a.closest("dialog") || a.hasAttribute("data-safe")) return;
    let url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (!/^https?:$/.test(url.protocol) || safe.includes(url.hostname) || url.hostname === location.hostname) return;
    e.preventDefault();
    if (!dialog) build();
    target = url.href;
    dialog.querySelector(".url").textContent = target;
    dialog.querySelector("a.btn").href = target;
    dialog.showModal();
  });
})();
