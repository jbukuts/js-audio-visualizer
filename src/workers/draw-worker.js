import { parentPort } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import { PGMFile, BMPFile } from '#image-files';

const IMG_TYPES = {
  pgm: PGMFile,
  bmp: BMPFile
};

parentPort.on('message', (msg) => {
  const {
    arr,
    frame_number,
    points_per_frame,
    frame_folder,
    screen_width,
    screen_height,
    point_spacing,
    digit_len,
    channels,
    total_samples,
    file_type = 'pgm'
  } = msg;

  // create image file representation and determine starting point within amplitude data
  const ImageFile = new IMG_TYPES[file_type]({ width: screen_width, height: screen_height });
  const shifter = frame_number * points_per_frame;

  // iterate over each point in the frame
  for (let p = 0; p < points_per_frame; p++) {
    // average channel values
    let y_value = 0;
    for (let c = 0; c < channels; c++) {
      y_value += arr[total_samples * c + shifter + p];
    }

    const x_value = Math.floor(p * point_spacing);
    y_value = Math.floor(y_value / channels);
    ImageFile.drawPoint({ x: x_value, y: y_value });
  }

  // write image file to temp folder
  const image_buffer = ImageFile.toFileBuffer();
  fs.writeFileSync(
    path.join(frame_folder, `frame-${String(frame_number).padStart(digit_len, '0')}.${file_type}`),
    image_buffer
  );

  parentPort.postMessage(frame_number);
});
