import fs from 'fs';
import getHeaderData from './read_header.js';
import getAmplitudeData from './read_amplitude.js';
import { convertRange } from './helpers.js';
// import { createCanvas } from 'canvas';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import os from 'os';
import crypto from 'crypto';
import path from 'path';
import { Worker } from 'worker_threads';
import PGMFile from './PGM.js';
// import { createRequire } from 'node:module';
// const require = createRequire(import.meta.url);

// const { createCanvas } = require('canvas');

ffmpeg.setFfmpegPath(ffmpegStatic);

// const TEMP_DIR = os.tmpdir();
const TEMP_DIR = './outputs';

// OUTPUTS
const FRAME_RATE = 60;
const FRAME_WIDTH = 1920;
const FRAME_HEIGHT = 1080;

const MAX_VALUES = {
    1: {
        8: { min: 0, max: 255 },
        16: { min: -32768, max: 32767 },
        24: { min: -8388608, max: 8388607 },
        32: { min: -2147483648, max: 2147483647 }
    },
    3: {
        32: { min: -1, max: 1 },
        64: { min: -1, max: 1 }
    },
    6: {
        8: { min: -32768, max: 32767 },
    }
};

function normalizeData(options) {
    const { header_data, amplitude_data, screen_height = FRAME_HEIGHT } = options;
    const {
        fmt_chunk: {
            fmt_type,
            bits_per_sample,
            channels,
            sub_code
        },
        data_chunk: {
            data_chunk_size
        }
    } = header_data;

    const format_code = fmt_type === 65534 ? sub_code : fmt_type;
    const { min, max } = MAX_VALUES[format_code][bits_per_sample];

    const bytes_per_sample = bits_per_sample / 8;
    const total_samples = data_chunk_size / bytes_per_sample / channels;

    const normalized_data = [...new Array(channels)].map(() => new Uint16Array(total_samples));
    for (let i = 0; i < channels; i++) {
        for (let j = 0; j < total_samples; j++) {
            const value = amplitude_data[i][j];
            
            const new_value = convertRange({ 
                old_min: min, 
                old_max: max, 
                new_min: 0, 
                new_max: screen_height,
                value
            })
            normalized_data[i][j] = new_value;
        }
    }
    return normalized_data;
}

async function fitToFrames(options) {
    const { 
        normalized_data, 
        screen_height = FRAME_HEIGHT, 
        screen_width = FRAME_WIDTH,
        frame_rate = FRAME_RATE,
        header_data, 
        audio_file_path
    } = options;

    const {
        fmt_chunk: {
            bits_per_sample,
            channels,
            sample_rate
        },
        data_chunk: {
            data_chunk_size
        }
    } = header_data;

    const bytes_per_sample = bits_per_sample / 8;
    const total_samples = data_chunk_size / bytes_per_sample / channels;
    const runtime = Math.ceil(total_samples / sample_rate);
    const total_frames = frame_rate * runtime;

    const points_per_frame = Math.floor(sample_rate / frame_rate);
    const point_spacing = screen_width / points_per_frame;

    // const canvas = createCanvas(screen_width, screen_height);
    // const ctx = canvas.getContext('2d');
    // ctx.fillStyle = "black";

    console.log(total_frames * points_per_frame);
    console.log({ runtime, points_per_frame })

    let video_output = ffmpeg();
    const frame_folder =  path.join(TEMP_DIR, crypto.randomUUID({disableEntropyCache : true}));
    console.log(frame_folder);
    fs.mkdirSync(frame_folder, { recursive: true });

    const sab = new SharedArrayBuffer(Uint16Array.BYTES_PER_ELEMENT * total_samples * channels);
    const shared_arr = new Int32Array(sab);

    for (let i = 0; i < channels; i++) {
        for (let j = 0; j < total_samples; j++) {
            shared_arr[(i * total_samples) + j] = normalized_data[i][j];
        }
    }

    const empty_point_arry = new Array(points_per_frame).fill(0);
    const empty_frame_arr = new Array(total_frames).fill(0);
    const digit_len = `${total_frames}`.length;

    // const worker_max = 8;
    // for (let f = 0; f < total_frames / worker_max; f++) {
    //     const workers = new Array(worker_max).fill(new Worker('./draw_worker.cjs'));

    //     await Promise.all(workers.map(async (w, offset) => {
    //         w.postMessage({
    //             type: 'draw',
    //             arr: shared_arr, 
    //             frame_number: (f * worker_max) + offset,
    //             screen_width, 
    //             screen_height,
    //             points_per_frame, 
    //             frame_folder, 
    //             point_spacing,
    //             digit_len
    //         })

    //         return new Promise((resolve) => {
    //             w.on('message', () => resolve());
    //         })
    //     }));
    // } 

    // await Promise.all(empty_frame_arr.map(async (_, i) => {
    //     const canvas = createCanvas(screen_width, screen_height);
    //     const ctx = canvas.getContext('2d');
    //     ctx.fillStyle = "black";
    //     ctx.fillRect(0, 0, canvas.width, canvas.height);
    //     ctx.fillStyle = "white";

    //     await Promise.all(empty_point_arry.map(async (_, j) => {
    //         const y_value = normalized_data[0][(i * points_per_frame) + j];
    //         const x_value = j * point_spacing;
    //         ctx.fillRect(x_value,y_value,5,5);
    //     }));

    //     const image_buffer = canvas.toBuffer('image/png', { compressionLevel: 3, filters: canvas.PNG_NO_FILTERS });

    //     return new Promise((resolve) => {
    //         fs.promises.writeFile(
    //             path.join(
    //                 frame_folder, 
    //                 `frame-${String(i).padStart(digit_len, '0')}.png`
    //             ), 
    //             image_buffer
    //         ).then(() => resolve());
    //     })
    // }));

    for (let i = 0; i < total_frames; i++) {
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(`${Math.ceil((i / total_frames) * 100)} % (${i+1} / ${total_frames})`);

        // ctx.fillRect(0, 0, canvas.width, canvas.height);

        // await Promise.all(empty_point_arry.map(async (_, j) => {
        //     for (let k = 0; k < channels; k++) {
        //         ctx.fillStyle = k === 0 ? "red" : 'blue';
        //         const y_value = normalized_data[k][(i * points_per_frame) + j];
        //         const x_value = j * point_spacing;
        //         ctx.fillRect(x_value,y_value,5,5);
        //     }
        // }));

        // ctx.fillStyle = "black";

        // const image_buffer = canvas.toBuffer('image/png', { compressionLevel: 3, filters: canvas.PNG_NO_FILTERS });

        const PGMImage = new PGMFile({ width: screen_width, height: screen_height });

        await Promise.all(empty_point_arry.map(async (_, j) => {
            // for (let k = 0; k < channels; k++) {
                
            // }

            const y_value = normalized_data[0][(i * points_per_frame) + j];
            const x_value = Math.floor(j * point_spacing);
            PGMImage.drawPoint({ x: x_value, y: y_value, value: 255 })
        }));

        
        const image_buffer = PGMImage.toFileBuffer();

        fs.writeFileSync(path.join(frame_folder, `frame-${String(i).padStart(digit_len, '0')}.pgm`), image_buffer);
    }

    video_output
        .input(path.join(frame_folder, `frame-%0${digit_len}d.pgm`))
        .inputOptions([`-framerate ${frame_rate}`])
        .input(audio_file_path)
        .videoCodec('libx264')
        .duration(runtime)
        .fps(frame_rate)
        .saveToFile('./test.mp4')
        .on('end', () => console.log('done'))
        .on('error', (error) => console.error(error))

    console.log({points_per_frame, total_frames})
}

// const filePath = './test_files/8_unsigned_stereo.wav';
// const filePath = './test_files/32_float_stereo.wav';
// const filePath = './more_tests/M1F1-AlawWE-AFsp.wav';
// const filePath = './test_files/64_float_stereo.wav';
// const filePath = './test_files/32_signed_stereo.wav';
const filePath = './test_files/FREE(32_stereo).wav';
const buffer = fs.readFileSync(filePath);

console.time('header_read');
const { header_data, offset } = getHeaderData({ buffer });
console.timeEnd('header_read');

console.log(header_data);

console.time('amp_read');
const amplitude_data = getAmplitudeData({ header_data, buffer, starting_offset: offset });
console.timeEnd('amp_read');

// console.log(amplitude_data[0].slice(500,600));

console.time('normalize');
const normalized_data = normalizeData({ amplitude_data, header_data });
console.timeEnd('normalize');

// console.log(normalized_data[0].slice(500,600))

console.time('draw');
const frameData = await fitToFrames({ header_data, normalized_data, audio_file_path: filePath });
console.timeEnd('draw');

// const normalizedData = normalizeDataToFrames({ headerData, amplitudeData, frameRate: FRAME_RATE, frameHeight: FRAME_HEIGHT, frameWidth: FRAME_WIDTH });







