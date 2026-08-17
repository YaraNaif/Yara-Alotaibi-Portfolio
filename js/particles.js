/* =============================================================================
   particles.js — animated neural-network canvas (the "Neuro symbol" brand mark)
   -----------------------------------------------------------------------------
   ============================================================================= */

function initNeuroCanvas(canvas) {
  if (canvas.dataset.shape === "brain") {
    initBrainCanvas(canvas);
    return;
  }
  if (canvas.dataset.shape === "brain-mesh") {
    initBrainMeshCanvas(canvas);
    return;
  }
  if (canvas.dataset.shape === "neuron") {
    initNeuronCanvas(canvas);
    return;
  }
  const ctx = canvas.getContext("2d");
  const nodeCount = parseInt(canvas.dataset.nodeCount || "50", 10);
  const speed = parseFloat(canvas.dataset.speed || "0.3");
  const linkDistance = parseInt(canvas.dataset.linkDistance || "140", 10);

  //draw one still frame instead of animating
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let width, height, nodes;

  function resize() {
    width = canvas.width = canvas.offsetWidth;
    height = canvas.height = canvas.offsetHeight;
  }

  function makeNodes() {
    nodes = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed,
    }));
  }

  function step(loop = true) {
    ctx.clearRect(0, 0, width, height);

    // move + draw each node, bouncing off the canvas edges
    nodes.forEach((n) => {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > width) n.vx *= -1;
      if (n.y < 0 || n.y > height) n.vy *= -1;

      ctx.beginPath();
      ctx.arc(n.x, n.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(78,127,255,0.7)"; // --blue
      ctx.fill();
    });

    // draw a fading line between any two nodes closer than linkDistance
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < linkDistance) {
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = `rgba(139,107,255,${1 - dist / linkDistance})`; // --violet, fades with distance
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    if (loop) requestAnimationFrame(step);
  }

  resize();
  makeNodes();
  window.addEventListener("resize", () => {
    resize();
    makeNodes(); // re-seed so nodes aren't stranded off-canvas after a resize
    if (reduceMotion) step(false);
  });

  if (reduceMotion) {
    step(false); // draw a single static frame, no requestAnimationFrame loop
  } else {
    requestAnimationFrame(step);
  }
}

/* =============================================================================
   initBrainCanvas — same node/link visual language as initNeuroCanvas above
   (blue nodes, violet fading links), but the nodes are held inside a brain
   silhouette instead of drifting freely across the canvas.
   ============================================================================= */

function initBrainCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  const nodeCount = parseInt(canvas.dataset.nodeCount || "160", 10);
  const speed = parseFloat(canvas.dataset.speed || "0.35"); // oscillation amplitude scale
  const linkDistance = parseInt(canvas.dataset.linkDistance || "34", 10);

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // design space the brain silhouette is drawn in, then scaled to fit the real canvas
  const DESIGN_W = 400;
  const DESIGN_H = 280;

  let width, height, scale, offsetX, offsetY, nodes;

  function resize() {
    width = canvas.width = canvas.offsetWidth;
    height = canvas.height = canvas.offsetHeight;
    // fit the design space inside the canvas, centered, preserving aspect ratio
    scale = Math.min(width / DESIGN_W, height / DESIGN_H);
    offsetX = (width - DESIGN_W * scale) / 2;
    offsetY = (height - DESIGN_H * scale) / 2;
  }

  // draws the brain silhouette into an offscreen canvas and returns its 2D context for sampling
  function drawBrainMask() {
    const mask = document.createElement("canvas");
    mask.width = DESIGN_W;
    mask.height = DESIGN_H;
    const mctx = mask.getContext("2d");

    function blob(cx, cy, rx, ry) {
      mctx.beginPath();
      mctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      mctx.fill();
    }

    mctx.fillStyle = "#fff";
    // main hemisphere lobes
    blob(150, 120, 92, 78);
    blob(250, 120, 92, 78);
    // frontal curvature (top)
    blob(150, 62, 46, 42);
    blob(250, 62, 46, 42);
    // temporal lobe bulges (lower sides)
    blob(112, 172, 48, 40);
    blob(288, 172, 48, 40);
    // cerebellum bump (back-bottom center)
    blob(200, 196, 40, 32);
    // brainstem
    blob(200, 235, 20, 32);

    // carve the longitudinal fissure — a wavy gap down the middle splitting the hemispheres
    mctx.globalCompositeOperation = "destination-out";
    mctx.lineWidth = 11;
    mctx.lineCap = "round";
    mctx.beginPath();
    mctx.moveTo(200, 35);
    mctx.quadraticCurveTo(190, 90, 200, 130);
    mctx.quadraticCurveTo(210, 160, 200, 190);
    mctx.stroke();
    mctx.globalCompositeOperation = "source-over";

    return mctx;
  }

  function makeNodes() {
    const mctx = drawBrainMask();
    const imageData = mctx.getImageData(0, 0, DESIGN_W, DESIGN_H).data;

    function isInsideBrain(x, y) {
      const px = Math.floor(x);
      const py = Math.floor(y);
      if (px < 0 || py < 0 || px >= DESIGN_W || py >= DESIGN_H) return false;
      return imageData[(py * DESIGN_W + px) * 4 + 3] > 0; // alpha channel
    }

    nodes = [];
    let attempts = 0;
    while (nodes.length < nodeCount && attempts < nodeCount * 60) {
      attempts++;
      const x = Math.random() * DESIGN_W;
      const y = Math.random() * DESIGN_H;
      if (isInsideBrain(x, y)) {
        nodes.push({
          anchorX: x,
          anchorY: y,
          phase: Math.random() * Math.PI * 2,
          phaseY: Math.random() * Math.PI * 2,
          freq: 0.6 + Math.random() * 0.6,
        });
      }
    }
  }

  function toCanvasSpace(designX, designY) {
    return [offsetX + designX * scale, offsetY + designY * scale];
  }

  function step(loop = true) {
    ctx.clearRect(0, 0, width, height);
    const t = performance.now() / 1000;

    const positions = nodes.map((n) => {
      const wobble = reduceMotion ? 0 : speed * 4;
      const dx = Math.sin(t * n.freq + n.phase) * wobble;
      const dy = Math.cos(t * n.freq + n.phaseY) * wobble;
      return toCanvasSpace(n.anchorX + dx, n.anchorY + dy);
    });

    // fading links between anchors close enough in design space (distance measured pre-scale)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].anchorX - nodes[j].anchorX;
        const dy = nodes[i].anchorY - nodes[j].anchorY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < linkDistance) {
          ctx.beginPath();
          ctx.moveTo(positions[i][0], positions[i][1]);
          ctx.lineTo(positions[j][0], positions[j][1]);
          ctx.strokeStyle = `rgba(139,107,255,${(1 - dist / linkDistance) * 0.8})`; // --violet, fades with distance
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // nodes drawn after links, with a soft glow for the holographic look
    ctx.shadowColor = "rgba(78,127,255,0.9)"; // --blue
    ctx.shadowBlur = 6;
    positions.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(200,215,255,0.95)";
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    if (loop) requestAnimationFrame(step);
  }

  resize();
  makeNodes();
  window.addEventListener("resize", () => {
    resize();
    if (reduceMotion) step(false);
  });

  if (reduceMotion) {
    step(false);
  } else {
    requestAnimationFrame(step);
  }
}


/* =============================================================================
   initNeuronCanvas — two connected neuron cells 
   ============================================================================= */

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildNeuronNetwork() {
  const rng = mulberry32(11);
  const points = [];
  const edges = []; // [fromIdx, toIdx, tier] — tier 0-2: dendrites, 3-4: axon
  const parentOf = {};

  function addPoint(x, y) {
    points.push([x, y]);
    return points.length - 1;
  }

  function grow(originIdx, angle, len, depth, tier) {
    const segs = 3;
    let idx = originIdx;
    let [x, y] = points[idx];
    let a = angle;
    for (let s = 0; s < segs; s++) {
      a += (rng() - 0.5) * 0.3;
      const nx = x + Math.cos(a) * (len / segs);
      const ny = y + Math.sin(a) * (len / segs);
      const nIdx = addPoint(nx, ny);
      edges.push([idx, nIdx, tier]);
      parentOf[nIdx] = idx;
      idx = nIdx; x = nx; y = ny;
    }
    if (depth > 0) {
      const spread = 0.6;
      grow(idx, a - spread * (0.6 + rng() * 0.5), len * 0.64, depth - 1, tier + 1);
      grow(idx, a + spread * (0.6 + rng() * 0.5), len * 0.64, depth - 1, tier + 1);
      return null; // branched further, no single leaf
    }
    return idx; // leaf tip
  }

  const leaves = [];
  const somas = [];

  function growCollectLeaves(originIdx, angle, len, depth, tier) {
    if (depth === 0) {
      const tip = grow(originIdx, angle, len, 0, tier);
      leaves.push(tip);
      return;
    }
    const segs = 3;
    let idx = originIdx;
    let [x, y] = points[idx];
    let a = angle;
    for (let s = 0; s < segs; s++) {
      a += (rng() - 0.5) * 0.3;
      const nx = x + Math.cos(a) * (len / segs);
      const ny = y + Math.sin(a) * (len / segs);
      const nIdx = addPoint(nx, ny);
      edges.push([idx, nIdx, tier]);
      parentOf[nIdx] = idx;
      idx = nIdx; x = nx; y = ny;
    }
    const spread = 0.6;
    growCollectLeaves(idx, a - spread * (0.6 + rng() * 0.5), len * 0.64, depth - 1, tier + 1);
    growCollectLeaves(idx, a + spread * (0.6 + rng() * 0.5), len * 0.64, depth - 1, tier + 1);
  }

  // ---- Neuron A (left, "sender") ----
  const somaA = addPoint(135, 175);
  somas.push(somaA);
  const dendriteAnglesA = [2.05, 2.4, 2.75, 3.1, 3.45, 3.8, 4.15, 4.5];
  dendriteAnglesA.forEach((ang) => growCollectLeaves(somaA, ang, 82, 2, 0));

  // Axon A: trunk toward soma B, then short terminal fork — tier 3/4 so it
  // renders in a distinct "signal" color, separate from the dendrites
  const axonTrunkEndA = grow(somaA, 0.0, 108, 0, 3);
  const axonTermA1 = grow(axonTrunkEndA, -0.35, 18, 0, 4);
  const axonTermA2 = grow(axonTrunkEndA, 0.35, 18, 0, 4);

  // ---- Neuron B (right, "receiver") ----
  const somaB = addPoint(135 + 108 + 54, 168); // gap after axon terminal = the synapse
  somas.push(somaB);
  // B gets its own full dendrite crown too, so it reads as a second complete
  // neuron rather than a stub — same density as A, fanning the other way
  const dendriteAnglesB = [-1.3, -0.95, -0.6, -0.25, 0.25, 0.6, 0.95, 1.3];
  dendriteAnglesB.forEach((ang) => growCollectLeaves(somaB, ang, 56, 1, 0));

  // Axon B: continues rightward off toward the edge, own terminal fork
  const axonTrunkEndB = grow(somaB, -0.05, 108, 0, 3);
  const axonTermB1 = grow(axonTrunkEndB, -0.35, 20, 0, 4);
  const axonTermB2 = grow(axonTrunkEndB, 0.35, 20, 0, 4);

  function pathToRoot(idx) {
    const path = [idx];
    let cur = idx;
    while (parentOf[cur] !== undefined) {
      cur = parentOf[cur];
      path.push(cur);
    }
    return path.reverse(); // root(soma) -> leaf
  }

  return {
    w: 480, h: 340,
    points, edges, somas, somaB,
    axonPathA: pathToRoot(axonTermA1),
    axonPathB: pathToRoot(axonTermB1),
    pathToRoot,
    allLeaves: leaves.filter((l) => l !== null),
  };
}

function initNeuronCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NET = buildNeuronNetwork();
  const DESIGN_W = NET.w, DESIGN_H = NET.h;

  let width, height, scale, offsetX, offsetY;

  function resize() {
    width = canvas.width = canvas.offsetWidth;
    height = canvas.height = canvas.offsetHeight;
    scale = Math.min(width / DESIGN_W, height / DESIGN_H);
    offsetX = (width - DESIGN_W * scale) / 2;
    offsetY = (height - DESIGN_H * scale) / 2;
  }

  // tiers 0-2: dendrites (violet, cooler — "input"); tiers 3-4: axon path (warmer blue/white — "output/signal")
  const tierWidth = [3, 1.8, 1.1, 3.2, 2];
  const tierAlpha = [0.85, 0.65, 0.5, 0.95, 0.8];
  const tierColor = [
    "139,107,255", "139,107,255", "139,107,255",
    "158,178,255", "200,190,255",
  ];

  let dendritePulses = Array.from({ length: 10 }, () => spawnDendritePulse());
  function spawnDendritePulse() {
    const leaf = NET.allLeaves[Math.floor(Math.random() * NET.allLeaves.length)];
    const path = NET.pathToRoot(leaf).slice().reverse(); // leaf -> soma
    return { path, t: Math.random(), speed: 0.15 + Math.random() * 0.12 };
  }

  const axonPhase = { t: 0 };

  function pointAt(path, t) {
    const segCount = path.length - 1;
    const f = t * segCount;
    const i = Math.min(Math.floor(f), segCount - 1);
    const localT = f - i;
    const [x0, y0] = NET.points[path[i]];
    const [x1, y1] = NET.points[path[i + 1]];
    return [x0 + (x1 - x0) * localT, y0 + (y1 - y0) * localT];
  }

  function step(loop = true) {
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    // RTL: flip horizontally so the signal reads right-to-left in Arabic,
    // matching the mirroring convention used elsewhere on the site
    if (document.body.classList.contains("lang-ar")) {
      ctx.translate(DESIGN_W, 0);
      ctx.scale(-1, 1);
    }

    // batched edges per tier for variable width + color (dendrites vs axon)
    for (let tier = 0; tier < tierWidth.length; tier++) {
      ctx.beginPath();
      NET.edges.forEach(([a, b, t]) => {
        if (t !== tier) return;
        const [x0, y0] = NET.points[a];
        const [x1, y1] = NET.points[b];
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
      });
      ctx.strokeStyle = `rgba(${tierColor[tier]},${tierAlpha[tier]})`;
      ctx.lineWidth = tierWidth[tier] / scale;
      ctx.lineCap = "round";
      if (tier === 3) {
        ctx.shadowColor = "rgba(158,178,255,0.6)";
        ctx.shadowBlur = 5 / scale;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // soma glow — outer halo + bright core, so each cell body is an unmistakable focal point
    NET.somas.forEach((idx) => {
      const [x, y] = NET.points[idx];
      const halo = ctx.createRadialGradient(x, y, 0, x, y, 34);
      halo.addColorStop(0, "rgba(139,107,255,0.35)");
      halo.addColorStop(1, "rgba(139,107,255,0)");
      ctx.beginPath();
      ctx.arc(x, y, 34, 0, Math.PI * 2);
      ctx.fillStyle = halo;
      ctx.fill();

      const grad = ctx.createRadialGradient(x, y, 0, x, y, 19);
      grad.addColorStop(0, "rgba(210,220,255,1)");
      grad.addColorStop(0.55, "rgba(120,155,255,0.95)");
      grad.addColorStop(1, "rgba(78,127,255,0.1)");
      ctx.beginPath();
      ctx.arc(x, y, 19, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.shadowColor = "rgba(78,127,255,1)";
      ctx.shadowBlur = 18 / scale;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    if (!reduceMotion) {
      // ambient "always thinking" dendrite pulses
      dendritePulses.forEach((p, i) => {
        p.t += p.speed * 0.016;
        if (p.t >= 1) { dendritePulses[i] = spawnDendritePulse(); return; }
        const [x, y] = pointAt(p.path, p.t);
        ctx.beginPath();
        ctx.arc(x, y, 2.2 / scale, 0, Math.PI * 2);
        ctx.shadowColor = "rgba(231,178,92,0.9)";
        ctx.shadowBlur = 8 / scale;
        ctx.fillStyle = "rgba(255,230,180,0.95)";
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // main firing sequence: soma A -> axon -> synapse gap -> soma B -> axon -> out
      axonPhase.t += 0.012;
      const totalDur = 2.6;
      const tt = (axonPhase.t % totalDur) / totalDur;
      let x, y, show = true;
      if (tt < 0.4) {
        [x, y] = pointAt(NET.axonPathA, tt / 0.4);
      } else if (tt < 0.52) {
        const gapT = (tt - 0.4) / 0.12;
        const [ex, ey] = NET.points[NET.axonPathA[NET.axonPathA.length - 1]];
        const [sx, sy] = NET.points[NET.somaB];
        x = ex + (sx - ex) * gapT; y = ey + (sy - ey) * gapT;
      } else if (tt < 0.9) {
        [x, y] = pointAt(NET.axonPathB, (tt - 0.52) / 0.38);
      } else {
        show = false;
      }
      if (show) {
        ctx.beginPath();
        ctx.arc(x, y, 3.4 / scale, 0, Math.PI * 2);
        ctx.shadowColor = "rgba(231,178,92,1)";
        ctx.shadowBlur = 14 / scale;
        ctx.fillStyle = "rgba(255,240,210,1)";
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    ctx.restore();
    if (loop) requestAnimationFrame(step);
  }

  resize();
  window.addEventListener("resize", resize);
  if (reduceMotion) {
    step(false);
  } else {
    requestAnimationFrame(step);
  }
}

function initAllNeuroCanvases() {
  document.querySelectorAll("canvas[data-neuro]").forEach(initNeuroCanvas);
}

document.addEventListener("DOMContentLoaded", initAllNeuroCanvases);
