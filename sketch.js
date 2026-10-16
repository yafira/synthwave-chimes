// sketch.js

let strings = [];
let chimes = [];
let synths = [];
let numChimes = 14;

let angle = 0;
let amplitude = 10;
let speed = 0.03;

let frequencies = [
  261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25,
  698.46, 783.99, 880.0, 987.77,
];

let scales = [
  [0, 2, 4, 7, 9], // major pentatonic
  [0, 3, 5, 7, 10], // minor pentatonic
  [0, 2, 4, 5, 7, 9, 11], // major
  [0, 2, 3, 5, 7, 8, 10], // natural minor
];
let selectedScale;

let shapes = ["circle", "flower", "square", "rectangle"];

let shapeSynthMap = {
  circle: {
    type: "sine",
    effects: { filterFreq: 1500, filterRes: 8, reverbTime: 2.5, delayTime: 0.3 },
  },
  flower: {
    type: "triangle", // softer than sine
    effects: { filterFreq: 800, filterRes: 10, reverbTime: 3, delayTime: 0.5 },
  },
  square: {
    type: "square",
    effects: { filterFreq: 1800, filterRes: 12, reverbTime: 1.8, delayTime: 0.4 },
  },
  rectangle: {
    type: "sawtooth",
    effects: { filterFreq: 2000, filterRes: 15, reverbTime: 2.0, delayTime: 0.6 },
  },
};

// relative paths so it works on github pages subfolders too
const FLOWER_SRC = "flower.png";
const PURPLE_FLOWER_SRC = "purple-flower.png";

let container;
let fft;
let vizCanvas, vizCtx, freqLabel, hint;

// 0..1 per chime, turned into real lengths based on screen height
let lengthRatios = [];
let layout = {};

// which chime each pointer is currently over
let pointerHits = {};
let releaseTimers = {};
let audioStarted = false;

function setup() {
  noCanvas();

  container = select("#chime-container");
  selectedScale = random(scales);
  fft = new p5.FFT();

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    amplitude = 3;
  }

  // visualizer: a real canvas we redraw every frame
  let viz = select("#visualization");
  vizCanvas = document.createElement("canvas");
  viz.elt.appendChild(vizCanvas);
  vizCtx = vizCanvas.getContext("2d");
  freqLabel = select("#freq-text");
  hint = select("#hint");

  for (let i = 0; i < numChimes; i++) {
    lengthRatios.push(random());

    let shape = shapes[i % shapes.length];

    // audio chain
    let fx = shapeSynthMap[shape].effects;
    let synth = new p5.Oscillator(shapeSynthMap[shape].type);
    let filter = new p5.LowPass();
    let reverb = new p5.Reverb();
    let delay = new p5.Delay();

    filter.freq(fx.filterFreq);
    filter.res(fx.filterRes);
    synth.connect(filter);
    synth.amp(0);
    reverb.process(synth, fx.reverbTime, 2);
    delay.process(synth, fx.delayTime, 0.7, 2300);
    synths.push(synth);

    // dom
    let string = createDiv("").addClass("string");
    let chime = createDiv("").addClass("chime").addClass(shape);
    chime.attribute("data-index", i);
    string.parent(container);
    chime.parent(container);

    if (shape === "flower") {
      let img = createImg(FLOWER_SRC, "");
      img.attribute("draggable", "false");
      img.parent(chime);
    }

    strings.push(string);
    chimes.push(chime);
  }

  setupPointers();
  computeLayout();
}

function computeLayout() {
  let w = container.elt.clientWidth;
  let h = container.elt.clientHeight;
  let mobile = w < 600;
  let short = h < 560;
  let gutter = mobile ? 16 : 32;

  let barWidth = min(550, w - gutter * 2 - 60); // 60 = hook slant
  container.elt.style.setProperty("--bar-width", `${barWidth}px`);

  let vizW = min(400, w - gutter * 2);
  let vizH = short ? 80 : mobile ? 110 : 200;
  let viz = select("#visualization").elt;
  viz.style.width = `${vizW}px`;
  viz.style.height = `${vizH}px`;
  hint.elt.style.bottom = `${vizH + 24}px`;

  // crisp lines on retina screens
  let dpr = window.devicePixelRatio || 1;
  vizCanvas.width = vizW * dpr;
  vizCanvas.height = vizH * dpr;
  vizCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  let top = select("#hook").elt.offsetHeight;
  let tallest = max(chimes.map((c) => c.elt.offsetHeight));

  // strings have to stop above the visualizer
  let room = h - vizH - 24 - top - tallest / 2 - 12;
  let maxLen = constrain(room, 80, 800);
  let minLen = maxLen * 0.3;

  layout = {
    barWidth,
    barLeft: (w - barWidth) / 2,
    top,
    amplitude: mobile ? amplitude * 0.6 : amplitude,
    lengths: lengthRatios.map((r) => lerp(minLen, maxLen, r)),
    sizes: chimes.map((c) => [c.elt.offsetWidth, c.elt.offsetHeight]),
    vizW,
    vizH,
  };
}

function draw() {
  angle += speed;
  let offsetX = sin(angle) * layout.amplitude;
  let { barWidth, barLeft, top, lengths, sizes } = layout;

  for (let i = 0; i < numChimes; i++) {
    let x = map(i, 0, numChimes - 1, 0, barWidth - 2) + offsetX + barLeft;
    x = constrain(x, barLeft, barLeft + barWidth - 2);

    let len = lengths[i];
    strings[i].position(x, top);
    strings[i].size(2, len);

    let [cw, ch] = sizes[i];
    chimes[i].position(x - cw / 2 + 1, top + len - ch / 2);
  }

  drawWaveform();
}

function drawWaveform() {
  let { vizW, vizH } = layout;
  vizCtx.clearRect(0, 0, vizW, vizH);

  let wave = fft.waveform();
  vizCtx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  vizCtx.lineWidth = 1.25;
  vizCtx.beginPath();
  for (let i = 0; i < wave.length; i++) {
    let x = (i / (wave.length - 1)) * vizW;
    let y = map(wave[i], -1, 1, vizH, 0);
    if (i === 0) vizCtx.moveTo(x, y);
    else vizCtx.lineTo(x, y);
  }
  vizCtx.stroke();
}

function windowResized() {
  computeLayout();
}

// one handler for mouse, pen and touch.
// mouse: hover strikes, leaving releases.
// touch: tap or drag across chimes to strum, they settle on their own.
function setupPointers() {
  let el = container.elt;

  let handle = (e) => {
    let hit = document.elementFromPoint(e.clientX, e.clientY);
    let chimeEl = hit && hit.closest(".chime");
    let idx = chimeEl ? Number(chimeEl.dataset.index) : -1;
    let prev = pointerHits[e.pointerId] ?? -1;
    if (idx === prev) return;

    if (prev >= 0 && e.pointerType === "mouse") release(prev);
    if (idx >= 0) strike(idx, e.pointerType !== "mouse");
    pointerHits[e.pointerId] = idx;
  };

  el.addEventListener("pointerdown", (e) => {
    startAudio();
    delete pointerHits[e.pointerId];
    handle(e);
  });
  el.addEventListener("pointermove", handle);

  let end = (e) => {
    let prev = pointerHits[e.pointerId] ?? -1;
    if (prev >= 0 && e.pointerType === "mouse") release(prev);
    delete pointerHits[e.pointerId];
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  el.addEventListener("pointerleave", end);

  // keyboard: space / enter plays a random chime
  window.addEventListener("keydown", (e) => {
    if (e.key !== " " && e.key !== "Enter") return;
    if (e.target.closest && e.target.closest("a")) return;
    e.preventDefault();
    startAudio();
    strike(floor(random(numChimes)), true);
  });
}

function startAudio() {
  if (audioStarted) return;
  userStartAudio();
  audioStarted = true;
  hint.addClass("hidden");
}

function strike(i, autoRelease) {
  let chime = chimes[i];
  chime.addClass("flip");

  if (chime.hasClass("flower")) {
    chime.elt.querySelector("img").src = PURPLE_FLOWER_SRC;
  } else {
    chime.style("background-color", getRandomColor());
  }

  playChimeSound(i);

  clearTimeout(releaseTimers[i]);
  if (autoRelease) releaseTimers[i] = setTimeout(() => release(i), 600);
}

function release(i) {
  clearTimeout(releaseTimers[i]);
  let chime = chimes[i];
  chime.removeClass("flip");

  if (chime.hasClass("flower")) {
    chime.elt.querySelector("img").src = FLOWER_SRC;
  } else {
    chime.style("background-color", "#000");
  }
}

function playChimeSound(i) {
  let baseFreq = random(frequencies);
  let step = random(selectedScale);
  let freq = baseFreq * pow(2, step / 12);

  let synth = synths[i];
  synth.freq(freq);
  synth.amp(0, 0);
  synth.start();
  synth.amp(0.3, 0.05); // fade in
  synth.amp(0, 0.5, 0.05); // fade out
  synth.stop(0.55);

  freqLabel.html(`${freq.toFixed(2)} Hz`);
}

function getRandomColor() {
  let r = floor(random(200, 256));
  let g = floor(random(200, 256));
  let b = floor(random(200, 256));
  return `rgb(${r}, ${g}, ${b})`;
}
