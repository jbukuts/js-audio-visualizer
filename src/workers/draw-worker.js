import { parentPort } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import { PGMFile } from '../image-files/index.js';

parentPort.on('message', async (msg) => {
    const { 
        arr, 
        frame_number, 
        points_per_frame, 
        frame_folder, 
        screen_width, 
        screen_height, 
        point_spacing,
        digit_len
    } = msg;

    const PGMImage = new PGMFile({ width: screen_width, height: screen_height });

    for (let p = 0; p < points_per_frame; p++) {
        const y_value = arr[(frame_number * points_per_frame) + p];
        const x_value = Math.floor(p * point_spacing);
        PGMImage.drawPoint({ x: x_value, y: y_value, value: 255 })
    }

    const image_buffer = PGMImage.toFileBuffer();
    fs.writeFileSync(path.join(frame_folder, `frame-${String(frame_number).padStart(digit_len, '0')}.pgm`), image_buffer);
    
    parentPort.postMessage(frame_number);
});