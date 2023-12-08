import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'fs';
import { getAmplitudeData, getHeaderData } from '#wav-parser';
import { normalizeData, drawFrames } from '#frame-draw';
import { keepTime } from '#helpers';
import defaults from '#defaults';
import themes from './src/themes.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import path from 'path';
import crypto from 'crypto';

ffmpeg.setFfmpegPath(ffmpegStatic);

const { info, success, head, error, warn } = themes;

const {
  TEMP_DIR,
  DEF_FRAME_HEIGHT,
  DEF_FRAME_WIDTH,
  DEF_FRAME_RATE,
  DEF_OUTPUT_PATH,
  DEF_THREADING,
  DEF_IMAGE_FILE
} = defaults;

yargs(hideBin(process.argv))
  .command(
    '$0 <audio_file>',
    'Visualizes WAV file',
    (yArgs) =>
      yArgs
        .positional('audio_file', {
          describe: 'Path to WAV file to visualize',
          type: 'string',
          normalize: true
        })
        .option('screen_height', {
          alias: 'h',
          describe: 'Screen height of output video',
          type: 'number',
          default: DEF_FRAME_HEIGHT
        })
        .option('screen_width', {
          alias: 'w',
          describe: 'Screen width of output video',
          type: 'number',
          default: DEF_FRAME_WIDTH
        })
        .option('framerate', {
          alias: 'r',
          describe: 'Framerate of output video',
          type: 'number',
          default: DEF_FRAME_RATE
        })
        .option('threads', {
          alias: 't',
          describe: 'Number of threads to use when rendering video',
          type: 'number',
          default: DEF_THREADING
        })
        .option('output_path', {
          alias: 'o',
          describe: 'Output video path',
          type: 'string',
          default: DEF_OUTPUT_PATH
        })
        .check((argv) => {
          const { audio_file } = argv;
          if (!fs.existsSync(audio_file))
            throw new Error(`Input file path does not exist:\n${audio_file}`);
          return true;
        }),
    async (argv) => {
      const { audio_file, screen_height, screen_width, framerate, output_path } = argv;

      console.log(warn('VIDEO DATA'));
      console.log(warn('Resolution:'), warn.bold(`${screen_height} x ${screen_width}`));
      console.log(warn('Framerate:'), warn.bold(framerate));

      const buffer = fs.readFileSync(audio_file);

      // read audio file header data
      const { header_data, offset } = await keepTime(getHeaderData, { buffer });

      const {
        fmt_chunk: { channels, sample_rate },
        derived_data: { runtime, file_size_mb }
      } = header_data;

      console.log(warn('HEADER DATA'));
      console.log(warn('File size:'), warn.bold(`${file_size_mb.toFixed(2)} MB`));
      console.log(warn('Sample rate:'), warn.bold(sample_rate));
      console.log(warn('Channels:'), warn.bold(channels));
      console.log(warn('Runtime:'), warn.bold(`${runtime} sec`));

      // read amplitude data from audio file
      const amplitude_data = await keepTime(getAmplitudeData, {
        header_data,
        buffer,
        starting_offset: offset
      });

      // fit amplitudes to y axis of video frame
      const normalized_data = await keepTime(normalizeData, {
        amplitude_data,
        header_data,
        screen_height: screen_height
      });

      const frame_folder = path.join(TEMP_DIR, crypto.randomUUID({ disableEntropyCache: true }));
      const image_file_type = DEF_IMAGE_FILE;
      const total_frames = framerate * runtime;
      const digit_len = total_frames.toString().length;
      console.log(`Storing intermittent frame data at: ${frame_folder}`);
      fs.mkdirSync(frame_folder, { recursive: true });

      try {
        await keepTime(drawFrames, {
          header_data,
          normalized_data,
          audio_file_path: audio_file,
          frame_folder,
          output_path,
          video_data: {
            screen_height,
            screen_width,
            frame_rate: framerate,
            output_path,
            image_file_type
          }
        });

        console.log(info('Finished drawing frames. Rendering video!'));

        await new Promise((resolve, reject) => {
          ffmpeg()
            .input(path.join(frame_folder, `frame-%0${digit_len}d.${image_file_type}`))
            .inputOptions([
              `-framerate ${framerate}`
              // '-pattern_type glob'
            ])
            .videoCodec('libx264')
            .size(`${screen_width}x${screen_height}`)
            .input(audio_file)
            .audioChannels(channels)
            .duration(runtime)
            .fps(framerate)
            .saveToFile(output_path)
            .on('end', () => {
              console.log('done');
              resolve();
            })
            .on('error', (error) => {
              console.error(`Failed to write video to disk: ${error}`);
              reject();
            });
        });

        console.log(success.bold('Success!'));
        console.log(head('Finished rending video to'), head.bold(output_path));
      } catch (err) {
        console.log(error('Something broke!'));
        console.error(err);
      } finally {
        console.log(`Deleting intermittent frame data at: ${frame_folder}`);
        fs.rmSync(frame_folder, { recursive: true, force: true });
      }

      process.exit(0);
    }
  )
  .parse();
