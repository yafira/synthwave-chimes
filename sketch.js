// sketch.js

let strings = [];
let chimes = [];
let numChimes = 14;
let angle = 0;
let amplitude = 10;
let speed = 0.03;
let synths = [];
let frequencies = [
  261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25,
  698.46, 783.99, 880.0, 987.77,
];

let scales = [
  [0, 2, 4, 7, 9], // major scale
  [0, 3, 5, 7, 10], // minor scale
  [0, 2, 4, 5, 7, 9, 11], // pentatonic scale
  [0, 2, 3, 5, 7, 8, 10], // chromatic scale
];

let stringLengths = [];
let shapes = ["circle", "flower", "square", "rectangle"];
let spacing = 2; // spacing between strings
let barWidth = 550;

let shapeSynthMap = {
  circle: {
    type: "sine",
    effects: {
      filterFreq: 1500,
      filterRes: 8,
      reverbTime: 2.5,
      delayTime: 0.3,
    },
  },
  flower: {
    type: "triangle", // softer than sine wave
    effects: {
      filterFreq: 800,
      filterRes: 10,
      reverbTime: 3,
      delayTime: 0.5,
    },
  },
  square: {
    type: "square",
    effects: {
      filterFreq: 1800,
      filterRes: 12,
      reverbTime: 1.8,
      delayTime: 0.4,
    },
  },
  rectangle: {
    type: "sawtooth",
    effects: {
      filterFreq: 2000,
      filterRes: 15,
      reverbTime: 2.0,
      delayTime: 0.6,
    },
  },
};

let fft;
let visualizationContainer;
let waveCanvas;
let freqDiv;

const FLOWER_SRC = "/flower.png";
const PURPLE_FLOWER_SRC = "/purple-flower.png"; // rename + put in /public

function setup() {
  // you were calling triangle() in draw(), but you also had noCanvas().
  // easiest fix: keep noCanvas() and do NOT draw the triangle in draw().
  // (use CSS for #hook instead)
  noCanvas();

  let container = select("#chime-container");
  let selectedScale = random(scales);

  // initialize FFT
  fft = new p5.FFT();

  // create and position the bar
  let bar = createDiv("").addClass("bar");
  bar.parent(container);
  bar.size(barWidth, 20);
  bar.style("left", `calc(50% - ${barWidth / 2}px)`);

  // create visualization container
  visualizationContainer = createDiv("").addClass("visualization");
  visualizationContainer.parent(container);
  visualizationContainer.size(400, 200);
  visualizationContainer.style("position", "absolute");
  visualizationContainer.style("bottom", "10px");
  visualizationContainer.style("left", "calc(50% - 200px)");

  // create a graphics buffer for waveform
  waveCanvas = createGraphics(400, 200);

  // initialize frequency text div
  freqDiv = createDiv("").addClass("freq-text");
  freqDiv.parent(container);
  freqDiv.style("position", "fixed");
  freqDiv.style("bottom", "10px");
  freqDiv.style("left", "10px");
  freqDiv.style("color", "#fff");

  // initialize chimes and strings
  for (let i = 0; i < numChimes; i++) {
    stringLengths.push(random(250, 800));
  }

  for (let i = 0; i < numChimes; i++) {
    let shape = shapes[i % shapes.length];

    // audio chain
    let synth = new p5.Oscillator(shapeSynthMap[shape].type);
    let filter = new p5.LowPass();
    let reverb = new p5.Reverb();
    let delay = new p5.Delay();

    filter.freq(shapeSynthMap[shape].effects.filterFreq);
    filter.res(shapeSynthMap[shape].effects.filterRes);

    synth.connect(filter);
    synth.amp(0.1);

    reverb.process(synth, shapeSynthMap[shape].effects.reverbTime, 2);
    delay.process(synth, shapeSynthMap[shape].effects.delayTime, 0.7, 2300);

    synths.push(synth);

    // dom elements
    let string = createDiv("").addClass("string");
    let chime = createDiv("").addClass("chime").addClass(shape);

    string.parent(container);
    chime.parent(container);

    // flower asset fix: use /public paths (no glitch UUID cdn)
    if (shape === "flower") {
      chime.html(""); // clear
      const img = createImg(FLOWER_SRC, "flower");
      img.parent(chime);
      img.style("width", "100%");
      img.style("height", "100%");
      img.style("display", "block");
      chime.style("background-color", "transparent");
    }

    strings.push(string);
    chimes.push(chime);

    // interactions
    chime.mouseOver(() => {
      chime.addClass("flip");
      playChimeSound(i, selectedScale);

      if (shape === "flower") {
        const imgEl = chime.elt.querySelector("img");
        if (imgEl) imgEl.src = PURPLE_FLOWER_SRC;
      } else {
        chime.style("background-color", getRandomColor());
      }

      updateVisualization(synth);
    });

    chime.mouseOut(() => {
      chime.removeClass("flip");

      if (shape === "flower") {
        const imgEl = chime.elt.querySelector("img");
        if (imgEl) imgEl.src = FLOWER_SRC;
      } else {
        chime.style("background-color", "#000000");
      }

      // clear visualization
      visualizationContainer.html("");
    });
  }

  updateChimePositions();
}

function draw() {
  angle += speed;
  let offsetX = sin(angle) * amplitude;

  let barLeft = (windowWidth - barWidth) / 2;

  // NOTE: removed triangle() drawing because we're using noCanvas()
  // style the #hook div in CSS instead.

  for (let i = 0; i < numChimes; i++) {
    let x = map(i, 0, numChimes - 1, 0, barWidth - spacing) + offsetX;
    x += barLeft;

    x = constrain(x, barLeft, barLeft + barWidth - spacing);

    let y = 70; // hook area baseline
    let stringHeight = stringLengths[i];

    strings[i].position(x, y);
    strings[i].size(2, stringHeight);

    let chimeWidth = chimes[i].elt.offsetWidth;
    chimes[i].position(
      x - chimeWidth / 2 + 1,
      y + stringHeight - chimes[i].elt.offsetHeight / 2
    );
  }
}

function updateChimePositions() {
  let barLeft = (windowWidth - barWidth) / 2;

  for (let i = 0; i < numChimes; i++) {
    let x = map(i, 0, numChimes - 1, 0, barWidth - spacing);
    x += barLeft;

    let y = 70;
    let stringHeight = stringLengths[i];

    strings[i].position(x, y);
    strings[i].size(2, stringHeight);

    let chimeWidth = chimes[i].elt.offsetWidth;
    chimes[i].position(
      x - chimeWidth / 2 + 1,
      y + stringHeight - chimes[i].elt.offsetHeight / 2
    );
  }
}

function windowResized() {
  // re-center everything on resize
  updateChimePositions();
}

function playChimeSound(index, scale) {
  let baseFreq = random(frequencies);
  let scaleIndex = floor(random(scale.length));
  let freq = baseFreq * pow(2, scale[scaleIndex] / 12);

  let synth = synths[index];
  if (synth instanceof p5.Oscillator) {
    synth.freq(freq);
    synth.amp(0, 0);
    synth.start();

    synth.amp(0.3, 0.05);
    synth.amp(0, 0.5, 0.05);

    synth.stop(0.55);
  }

  freqDiv.html(`Frequency: ${freq.toFixed(2)} Hz`);
}

function updateVisualization(synth) {
  visualizationContainer.html("");

  waveCanvas.clear();

  fft.analyze();
  let waveform = fft.waveform();

  let waveColor = color("#7778A7");

  waveCanvas.stroke(waveColor);
  waveCanvas.strokeWeight(0.5);
  waveCanvas.noFill();
  waveCanvas.beginShape();

  for (let i = 0; i < waveform.length; i++) {
    let x = map(i, 0, waveform.length, 0, waveCanvas.width);
    let y = map(waveform[i], -1, 1, waveCanvas.height, 0);
    waveCanvas.vertex(x, y);
  }
  waveCanvas.endShape();

  let imgUrl = waveCanvas.canvas.toDataURL();
  let img = createImg(imgUrl, "Waveform Visualization");
  img.parent(visualizationContainer);

  let freq = synth.freq();
  if (typeof freq === "number") {
    let freqText = `Frequency: ${freq.toFixed(2)} Hz`;
    let localFreqDiv = createDiv(freqText).addClass("freq-text");
    localFreqDiv.parent(visualizationContainer);
  } else {
    console.error("Frequency value is not a number or is undefined.");
  }
}

function getRandomColor() {
  const r = Math.floor(Math.random() * 56) + 200;
  const g = Math.floor(Math.random() * 56) + 200;
  const b = Math.floor(Math.random() * 56) + 200;
  return `rgb(${r}, ${g}, ${b})`;
}
