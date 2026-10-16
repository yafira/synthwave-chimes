# synthwave chimes 🌸🎐🎵

a digital wind chime made with p5.js and p5.sound. shapes hang from a swaying bar, and each one plays a soft synth tone when you touch it.

made as a showcase project for [School for Poetic Computation's The Musical Web](https://sfpc.study/sessions/summer-24/musical-web) class, Summer 2024.

## how to play

- **desktop:** click once to wake up the audio, then hover over the chimes
- **phone / tablet:** tap a chime, or drag your finger across them to strum
- **keyboard:** press space or enter to ring a random chime

browsers block sound until you interact with the page, so if nothing plays at first, click or tap once. :)

## what's happening

- 14 chimes hang from the bar on strings of random lengths, swaying slowly like they're in the wind
- each shape has its own voice:
  - **circle:** sine wave
  - **flower:** triangle wave (the softest one)
  - **square:** square wave
  - **rectangle:** sawtooth wave
- every voice runs through a low-pass filter, reverb, and delay, tuned per shape
- notes are picked from a scale chosen at random on each page load (major pentatonic, minor pentatonic, major, or natural minor)
- each note fades in over 0.05s and out over 0.5s, like a real chime ringing out
- struck chimes flip and change to a random pastel color
- the glass panel at the bottom draws the live waveform and shows the frequency of the last note

## responsive

the layout is computed from the screen size, so the bar, strings, and visualizer all fit on phones, tablets, landscape, and desktop. strings shorten on small screens so chimes always stay above the visualizer. if your system is set to reduce motion, the sway gets gentler.

## run it locally

it's a static site, no build step. serve the folder with any local server (audio worklets don't load from `file://`):

```
npx serve .
```

or

```
python3 -m http.server
```

then open the address it prints.

## files

- `index.html`: page structure
- `style.css`: layout, shapes, and the frosted visualizer
- `sketch.js`: layout math, sound, interaction, and waveform drawing
- `flower.png`, `purple-flower.png`: the flower chime and its struck state

## built with

- [p5.js](https://p5js.org/) 1.4.0
- [p5.sound](https://p5js.org/reference/#/libraries/p5.sound)
- [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono)

crafted with 🖤 by [yafira (electrocute)](https://yafira.xyz/)
