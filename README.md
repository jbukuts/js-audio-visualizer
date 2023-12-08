# wav-viz

Minimal dependency CLI tool for creating amplitude audio visualization videos of `WAV` files. Automatically renders as `*.mp4` file.

## Installation

```bash
npm install https://github.com/jbukuts/js-audio-visualizer.git
```

## Use

```bash
wav-viz [filename] [options]
```

```txt
Visualizes WAV file

Positionals:
  audio_file  Path to WAV file to visualize                             [string]

Options:
      --help           Show help                                       [boolean]
      --version        Show version number                             [boolean]
  -h, --screen_height  Screen height of output video     [number] [default: 720]
  -w, --screen_width   Screen width of output video     [number] [default: 1280]
  -r, --framerate      Framerate of output video          [number] [default: 24]
  -t, --threads        Number of threads to use when rendering video
                                                          [number] [default: 16]
  -o, --output_path    Output video path        [string] [default: "./test.mp4"]
```

## Running locally

To run the repo locally start by installing dependencies via:

```bash
npm ci
```

Then you can run the script via:

```bash
node bin.js [filename] [options]
```

## Important notes

Below are some important things to keep in mind as you use the script.

### Storage headroom

As frames are being rendered they are stored as image files intermittently within your OSes temporary folder. This allows for them to be created in parallel easily and then stitched together to create the final video. Each frame is created as either a P2-encoded `PGM` file or a `BMP` file (`BMP` is the default since they're smaller). These files are uncompressed and because thousands of them may be stored at a time they can end up taking up a massive amount of space during the render process. With that in mind, I'd recommend you be mindful of storage headroom when running the script.

### Multi-threading

Another note is on threading. By default, the script will use the maximum amount of CPU threads available when drawing each frame to the temp folder. This can be tweaked via the `--threads` / `-t` option.

Since all rendering is done on the CPU if you use the default value expect to hit 100% utilization.

### WAV Compatibility

Lastly, a note on compatibility with `WAV` files. Most common encodings with `WAV` files will work fine. This means if a `WAV` file is encoded without any compression it should work fine. I wrote the `WAV` parser myself for fun as a challenge so some of the more nuanced parts of the spec may have been ignored.

If there's something in your `WAV` file the parser isn't prepared for it will tell you what chunk in the header tripped it up and simply stop. If you get an error like this feel free to open an issue and I'll attempt to patch the parser to read that chunk. However, if the chunk relates to compression I'll probably close it (compression is for the `MP3` spec and why someone thought `WAV` needed it is beyond my understanding; we have different formats for a reason).
