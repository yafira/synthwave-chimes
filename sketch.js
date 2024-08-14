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

function setup() {
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
  freqDiv.style("color", "#fff"); // change color if needed

  // initialize chimes and strings
  for (let i = 0; i < numChimes; i++) {
    stringLengths.push(random(250, 800));
  }

  for (let i = 0; i < numChimes; i++) {
    let shape = shapes[i % shapes.length];
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

    let string = createDiv("").addClass("string");
    let chime = createDiv("").addClass("chime").addClass(shape);
    if (shape === "flower") {
      chime.html('<img src="https://cdn.glitch.global/3e2cd494-d6a5-41df-8328-01ae17a7f307/flower.png?v=1723595009360" alt="flower" />');
      chime.style("background-color", "transparent");
    }
    string.parent(container);
    chime.parent(container);
    strings.push(string);
    chimes.push(chime);

    chime.mouseOver(() => {
      chime.addClass("flip"); // adds flip class
      playChimeSound(i, selectedScale);
      if (shape !== "flower") {
        chime.style("background-color", getRandomColor());
      }
      updateVisualization(synth);
    });

    chime.mouseOut(() => {
      chime.removeClass("flip"); // removes flip class
      if (shape !== "flower") {
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

  let barLeft = (windowWidth - barWidth) / 2; // center the bar within the window width

  // triangular hook
  let hookX = windowWidth / 2;
  let hookY = 30; // positions the hook above the strings
  let hookSize = 40;
  fill(150);
  noStroke();
  triangle(
    hookX,
    hookY,
    hookX - hookSize,
    hookY + hookSize,
    hookX + hookSize,
    hookY + hookSize
  );

  for (let i = 0; i < numChimes; i++) {
    let x = map(i, 0, numChimes - 1, 0, barWidth - spacing) + offsetX;
    x += barLeft; // bar's left offset to center the strings

    // x is within the bar's width
    x = constrain(x, barLeft, barLeft + barWidth - spacing);

    let y = hookY + hookSize; // align with the bottom of the hook
    let stringHeight = stringLengths[i];

    strings[i].position(x, y);
    strings[i].size(2, stringHeight);

    // position the chimes centered at the bottom of the strings
    let chimeWidth = chimes[i].elt.offsetWidth;
    chimes[i].position(
      x - chimeWidth / 2 + 1,
      y + stringHeight - chimes[i].elt.offsetHeight / 2
    );
  }
}

function updateChimePositions() {
  let barLeft = (windowWidth - barWidth) / 2; // center the bar within the window width

  for (let i = 0; i < numChimes; i++) {
    let x = map(i, 0, numChimes - 1, 0, barWidth - spacing); // constrain x to within the bar width
    x += barLeft; // bar's left offset to center the strings

    let y = 50;
    let stringHeight = stringLengths[i];

    // position strings to appear as if hanging from the hook
    strings[i].position(x, y - 50); // adjust y to align with the hook
    strings[i].size(2, stringHeight);

    // position the chimes centered at the bottom of the strings
    let chimeWidth = chimes[i].elt.offsetWidth;
    chimes[i].position(
      x - chimeWidth / 2 + 1,
      y + stringHeight - chimes[i].elt.offsetHeight / 2 - 50
    ); // y to align with the hook
  }
}

function playChimeSound(index, scale) {
  let baseFreq = random(frequencies);
  let scaleIndex = floor(random(scale.length));
  let freq = baseFreq * pow(2, scale[scaleIndex] / 12);

  let velocity = 0.3; // increased velocity for a more pronounced sound
  let duration = 1.5; // longer duration for each sound

  let synth = synths[index];
  if (synth instanceof p5.Oscillator) {
    synth.freq(freq);
    synth.amp(velocity, 0.05);
    synth.start();
    synth.stop(duration);
  }

  // update frequency text
  freqDiv.html(`Frequency: ${freq.toFixed(2)} Hz`);
}

function updateVisualization(synth) {
  // clear the previous visualization
  waveCanvas.clear();
  // waveCanvas.background(255); // background color of the canvas

  // get waveform data after analyzing the current state
  fft.analyze();
  let waveform = fft.waveform();

  // define colors
  let waveColor = color("#7778A7");

  // draw waveform on the graphics buffer
  waveCanvas.stroke(waveColor);
  waveCanvas.strokeWeight(0.5);
  waveCanvas.noFill();
  waveCanvas.beginShape();
  for (let i = 0; i < waveform.length; i++) {
    let x = map(i, 0, waveform.length, 0, waveCanvas.width);
    let y = map(waveform[i], -1, 1, waveCanvas.height, 0); // flip y-axis
    waveCanvas.vertex(x, y);
  }
  waveCanvas.endShape();

  // create an HTML canvas element to display the graphics
  let imgUrl = waveCanvas.canvas.toDataURL();
  let img = createImg(imgUrl, "Waveform Visualization");
  img.parent(visualizationContainer); // add the image to the visualization container

  // add frequency text on top of the waveform
  let freq = synth.freq(); // get frequency
  if (typeof freq === "number") {
    // check if freq is a number
    let freqText = `Frequency: ${freq.toFixed(2)} Hz`;
    let freqDiv = createDiv(freqText).addClass("freq-text");
    freqDiv.parent(visualizationContainer);
  } else {
    console.error("Frequency value is not a number or is undefined.");
  }
}

function getRandomColor() {
  const r = Math.floor(Math.random() * 56) + 200; // range 200 to 255
  const g = Math.floor(Math.random() * 56) + 200;
  const b = Math.floor(Math.random() * 56) + 200;

  return `rgb(${r}, ${g}, ${b})`;
}
