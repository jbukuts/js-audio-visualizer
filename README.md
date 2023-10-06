# js-audio-visualizer

CLI tool for creating amplitude audio visualization videos of WAV files.

## Use

```bash
wav-viz [filename] [options]
```

## Running locally

To run the repo locally start by installing dependencies via:

```bash
npm ci
```

Then you can run the script via:

```bash
npm start [filename] [options]
```

## Important notes

As frames are being rendered they are stored as image files intermittently within your OSes temporary folder. They are saved as `P2` encoded PGM files. These files are uncompressed and because thousands of them may be stored at a time they can end up taking up a massive amount of space during the render process. With that in mind, I'd recommend around **30 GB** of headroom to be completely safe.

To get a rough idea of the space that may be taken up here's an equation:

```txt
4 * [video_height] * [video_width] * [frame_rate] * [audio_length] = [bytes of storage consumed]
```

> This equation assumes each pixel takes up 4 bytes which is a worst case scenario

Of course, after the video file is created these frames are deleted completely from the filesystem.