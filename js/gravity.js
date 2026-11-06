// konami code (up up down down left right left right b a): everything on the page falls and can be thrown around.
// matter.js is only downloaded once the code is entered. press esc (or enter the code again) to put it all back.
(function () {
  const CODE = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  const MATTER = "https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js";
  const MATTER_SRI = "sha384-ZRKYEXtLBVeqs9z1WxyeKutCqnkqolS/r1EUWuoUpG4ZKbnRAIXnHhHdnNuiB6CL";
  let pos = 0, active = false;

  document.addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input, textarea, select, [contenteditable]")) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (active && key === "Escape") return location.reload();
    pos = key === CODE[pos] ? pos + 1 : key === CODE[0] ? 1 : 0;
    if (pos < CODE.length) return;
    pos = 0;
    if (active) return location.reload();
    active = true;
    load().then(start).catch(() => { active = false; });
  });

  function load() {
    if (window.Matter) return Promise.resolve();
    return new Promise((ok, fail) => {
      const s = document.createElement("script");
      s.src = MATTER;
      s.integrity = MATTER_SRI;
      s.crossOrigin = "anonymous";
      s.onload = ok;
      s.onerror = fail;
      document.head.appendChild(s);
    });
  }

  function start() {
    const { Engine, Runner, Bodies, Body, Composite, Mouse, MouseConstraint, Events } = window.Matter;
    window.scrollTo(0, 0);

    // the things that fall: both bars and every panel. measure them all before moving any, so the layout doesn't shift mid-way
    const els = [...document.querySelectorAll("body > .bar, body > .top, .panel:not(dialog)")]
      .filter((el) => !el.hidden && el.offsetParent !== null);
    const boxes = els.map((el) => ({ el, r: el.getBoundingClientRect() })).filter((b) => b.r.width && b.r.height);

    const html = document.documentElement;
    html.style.overflow = "hidden";
    document.body.style.userSelect = "none";
    document.body.style.minHeight = "100vh";

    const engine = Engine.create();
    engine.gravity.y = 1;
    const W = innerWidth, H = innerHeight, T = 200;

    const bodies = boxes.map(({ el, r }) => {
      Object.assign(el.style, {
        position: "fixed", left: "0", top: "0", margin: "0",
        width: r.width + "px", height: r.height + "px",
        animation: "none", zIndex: "10", willChange: "transform",
      });
      const b = Bodies.rectangle(r.left + r.width / 2, r.top + r.height / 2, r.width, r.height, {
        restitution: 0.25, friction: 0.4, frictionAir: 0.01, density: 0.001,
      });
      // a tiny shove so things don't fall perfectly flat
      Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.02);
      b.el = el;
      b.w = r.width;
      b.h = r.height;
      return b;
    });

    const walls = [
      Bodies.rectangle(W / 2, H + T / 2, W * 3, T, { isStatic: true }),   // floor
      Bodies.rectangle(-T / 2, H / 2 - H, T, H * 4, { isStatic: true }),  // left
      Bodies.rectangle(W + T / 2, H / 2 - H, T, H * 4, { isStatic: true }), // right
    ];
    Composite.add(engine.world, [...bodies, ...walls]);

    // grab and throw with the mouse or a finger
    const mouse = Mouse.create(document.body);
    mouse.element.removeEventListener("wheel", mouse.mousewheel);
    mouse.element.removeEventListener("mousewheel", mouse.mousewheel);
    mouse.element.removeEventListener("DOMMouseScroll", mouse.mousewheel);
    const grab = MouseConstraint.create(engine, { mouse, constraint: { stiffness: 0.2, render: { visible: false } } });
    Composite.add(engine.world, grab);

    // don't follow a link if the mouse was dragging something
    let downX = 0, downY = 0;
    document.addEventListener("pointerdown", (e) => { downX = e.clientX; downY = e.clientY; }, true);
    document.addEventListener("click", (e) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    Events.on(engine, "afterUpdate", () => {
      for (const b of bodies) {
        b.el.style.transform = `translate(${b.position.x - b.w / 2}px, ${b.position.y - b.h / 2}px) rotate(${b.angle}rad)`;
      }
    });

    addEventListener("resize", () => {
      Body.setPosition(walls[0], { x: innerWidth / 2, y: innerHeight + T / 2 });
      Body.setPosition(walls[2], { x: innerWidth + T / 2, y: walls[2].position.y });
    });

    Runner.run(Runner.create(), engine);

    const tip = document.createElement("div");
    tip.className = "gravity-tip";
    tip.textContent = "drag stuff around · esc to put it back";
    document.body.appendChild(tip);
  }
})();
