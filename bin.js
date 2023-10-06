import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import os from 'os';
import crypto from 'crypto';
import path from 'path';
import { Worker } from 'worker_threads';
import { getHeaderData, getAmplitudeData } from './src/wav-parser/index.js';
import { convertRange } from './src/helpers.js';
import Crayon from './src/crayon-box.js';

ffmpeg.setFfmpegPath(ffmpegStatic);

const TEMP_DIR = os.tmpdir();
const DEF_OUTPUT_PATH = './test.mp4';

// OUTPUTS
const FRAME_RATE = 30;
const FRAME_WIDTH = 1000;
const FRAME_HEIGHT = 1000;

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
            });
            normalized_data[i][j] = screen_height - new_value;
        }
    }
    return normalized_data;
}

async function drawFrames(options) {
    const { 
        normalized_data, 
        screen_height = FRAME_HEIGHT, 
        screen_width = FRAME_WIDTH,
        frame_rate = FRAME_RATE,
        header_data, 
        audio_file_path,
        frame_folder,
        output_path = DEF_OUTPUT_PATH
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


    const shared_buffer = new SharedArrayBuffer(Uint16Array.BYTES_PER_ELEMENT * total_samples * channels);
    const shared_arr = new Int32Array(shared_buffer);

    for (let i = 0; i < channels; i++) {
        for (let j = 0; j < total_samples; j++) {
            shared_arr[(i * total_samples) + j] = normalized_data[i][j];
        }
    }

    const digit_len = total_frames.toString().length;
    const worker_max = 4;
    const workers = [...new Array(worker_max)].map(() => {
        return new Worker('./src/workers/draw-worker.js')
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
            digit_len
        })
    }

    let highest_frame = 0;
    const printStatus = (current_frame) => {
        highest_frame = current_frame;
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write(`${Math.ceil((current_frame / (total_frames)) * 100)} % (${current_frame} / ${total_frames})`);
    }

    // quick and dirty pool
    // as soon as a worker messages the main thread 
    // it's done it starts with a new frame
    await Promise.all(workers.map((worker, index) => {
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
        })
    }));

    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(path.join(frame_folder, `frame-%0${digit_len}d.pgm`))
            .inputOptions([
                `-framerate ${frame_rate}`, 
                // '-pattern_type glob'
            ])
            .videoCodec('libx264')
            .size(`${screen_height}x${screen_width}`)
            .input(audio_file_path)
            .audioChannels(channels)
            .duration(runtime)
            .fps(frame_rate)
            .saveToFile(output_path)
            .on('end', () => {
                console.log('done');
                resolve();
            })
            .on('error', (error) => {
                console.error(`Failed to write video to disk: ${error}`);
                reject();
            })
    })
}


console.log(Crayon.blue(''))

// const filePath = './test_files/8_unsigned_stereo.wav';
// const filePath = './test_files/32_float_stereo.wav';
// const filePath = './more_tests/M1F1-AlawWE-AFsp.wav';
// const filePath = './test_files/64_float_stereo.wav';
// const filePath = './test_files/32_signed_stereo.wav';
const filePath = './test_files/FREE(32_stereo).wav';
const output_path = DEF_OUTPUT_PATH;
const buffer = fs.readFileSync(filePath);

async function keepTime(func, ...args) {

    let start_time = performance.now();
    const value = await func(...args);
    let end_time = performance.now();

    return {
        elapsed_time: Number.parseFloat(end_time - start_time).toFixed(2),
        value
    }
}

// read audio file header data
const { 
    value: { header_data, offset }, 
    elapsed_time: header_time 
} = await keepTime(() => getHeaderData({ buffer }));
console.log(Crayon.green('Successfully read header data!'));
console.log(Crayon.blue(`Reading header took: `) + Crayon.blue(`${header_time} sec`, { style: 'bold' }));

// read amplitude data from audio file
const {
    value: amplitude_data,
    elapsed_time: amp_time
} = await keepTime(() => getAmplitudeData({ header_data, buffer, starting_offset: offset }))
console.log(Crayon.green('Successfully read amplitude data!'));
console.log(Crayon.blue(`Reading amplitude data took: `) + Crayon.blue(`${amp_time} sec`, { style: 'bold' }));

const {
    value: normalized_data,
    elapsed_time: normalize_time
} = await keepTime(() => normalizeData({ amplitude_data, header_data }))
console.log(Crayon.green('Successfully normalized data to frames!'));
console.log(Crayon.blue(`Normalizing data took: `) + Crayon.blue(`${normalize_time} sec`, { style: 'bold' }));


const frame_folder =  path.join(TEMP_DIR, crypto.randomUUID({ disableEntropyCache : true }));
console.log(`Storing intermittent frame data at: ${frame_folder}`);
fs.mkdirSync(frame_folder, { recursive: true });


try {
    // draw frames of video

    const {
        elapsed_time: frame_time
    } = await keepTime(() => drawFrames({ 
        header_data, 
        normalized_data, 
        audio_file_path: filePath, 
        frame_folder, 
        output_path 
    }));

    console.log(Crayon.green('Success!', { style: 'bold' }));
    console.log(Crayon.blue(`Rendering took: `) + Crayon.blue(`${normalize_time} sec`, { style: 'bold' }));
    console.log(Crayon.purple(`Finished rending video to `) + Crayon.purple(output_path, { style: 'bold' }));
}
catch(err) {
    console.log(Crayon.red('Something broke!'));
    console.error(err);
}
finally {
    console.log(`Deleting intermittent frame data at: ${frame_folder}`);
    fs.rmSync(frame_folder, { recursive: true, force: true });
}








