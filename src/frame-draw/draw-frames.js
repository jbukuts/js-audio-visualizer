import { Worker } from 'worker_threads';
import themes from '#themes';
import defaults from '#defaults';
import path from 'path';

const { warn } = themes;

const {
  DEF_FRAME_HEIGHT,
  DEF_FRAME_WIDTH,
  DEF_FRAME_RATE,
  DEF_IMAGE_FILE,
  DEF_THREADING,
  SRC_PATH
} = defaults;

/**
 * @typedef {Object} VideoData
 * @prop {number=} screen_height
 * @prop {number=} screen_width
 * @prop {number=} frame_rate
 * @prop {string=} image_file_type
 */

/**
 * @typedef {import('../wav-parser/read-header.js').HeaderData} HeaderData
 */

/**
 * Responsible for drawing actual visual data to video
 * @param {Object} options
 * @param {number[][]} options.normalized_data normalized amplitude data from WAV file
 * @param {VideoData} options.video_data video output settings
 * @param {HeaderData} options.header_data header data of the WAV file
 * @param {string} options.frame_folder temporary place to store frames of video
 * @returns {Promise<void>}
 */
export default async function drawFrames(options) {
  const {
    normalized_data,
    video_data,
    header_data,
    frame_folder,
    worker_max = DEF_THREADING
  } = options;

  const {
    screen_height = DEF_FRAME_HEIGHT,
    screen_width = DEF_FRAME_WIDTH,
    frame_rate = DEF_FRAME_RATE,
    image_file_type = DEF_IMAGE_FILE
  } = video_data || {};

  const {
    fmt_chunk: { channels, sample_rate },
    derived_data: { total_samples, runtime }
  } = header_data;

  // needed derived data
  const total_frames = frame_rate * runtime;
  const points_per_frame = Math.floor(sample_rate / frame_rate);
  const point_spacing = screen_width / points_per_frame;

  console.log(warn('Total frames:'), warn.bold(total_frames));
  console.log(warn('Points/frame:'), warn.bold(points_per_frame));
  console.log(warn('Point spacing:'), warn.bold(point_spacing));

  // dump data into share buffer
  const ArrayType = Uint16Array;
  const shared_buffer = new SharedArrayBuffer(
    ArrayType.BYTES_PER_ELEMENT * total_samples * channels
  );
  const shared_arr = new ArrayType(shared_buffer);
  for (let i = 0; i < channels; i++) {
    for (let j = 0; j < total_samples; j++) {
      shared_arr[i * total_samples + j] = normalized_data[i][j];
    }
  }

  const digit_len = total_frames.toString().length;
  const workers = [...new Array(worker_max)].map(() => {
    return new Worker(path.join(SRC_PATH, 'workers/draw-worker.js'));
  });

  const startWorker = (worker, frame_number) => {
    worker.postMessage({
      arr: shared_arr,
      frame_number,
      screen_width,
      screen_height,
      points_per_frame,
      frame_folder,
      point_spacing,
      digit_len,
      channels,
      total_samples,
      file_type: image_file_type
    });
  };

  let highest_frame = 0;
  const printStatus = (current_frame) => {
    highest_frame = current_frame;
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(
      `${Math.ceil((current_frame / total_frames) * 100)} % (${current_frame} / ${total_frames})`
    );
  };

  // quick and dirty pool
  // as soon as a worker messages the main thread
  // it's done it starts with a new frame
  await Promise.all(
    workers.map((worker, index) => {
      startWorker(worker, index);
      return new Promise((resolve) => {
        worker.on('message', (frame_finished) => {
          if (frame_finished > highest_frame) printStatus(frame_finished);

          const next_frame = frame_finished + worker_max;
          if (next_frame > total_frames) {
            worker.terminate();
            resolve();
            return;
          }

          startWorker(worker, next_frame);
        });
      });
    })
  );

  return;
}
