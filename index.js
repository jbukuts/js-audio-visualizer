import fs from 'fs';
import assert from 'assert';
import { channel } from 'diagnostics_channel';


// OUTPUTS
const FRAME_RATE = 30;
const FRAME_WIDTH = 1920;
const FRAME_HEIGHT = 1080;

// 1 - Integer PCM
// 3 - Float PCM
const SUPPORTED_ENCODINGS = [1, 3];

const DATA_READERS = {
    '1-8': 'readUInt8',
    '1-16': 'readInt16LE',
    '1-24': 'readInt24LE',
    '1-32': 'readInt32LE',
    '3-32': 'readFloatLE'
}

const HEADER_READERS = {
    1: 'readUInt8',
    2: 'readUInt16LE',
    4: 'readInt32LE',
}

const ABSTRACT_HEADER_TABLE = [
    { name: 'riff', size: 4, type: 'string' },
    { name: 'riff_chunk_size', size: 4 },
    { name: 'file_type', size: 4, type: 'string' },
    { name: 'fmt_header', size: 4, type: 'string' },
    { name: 'fmt_data_length', size: 4 },
    { name: 'fmt_type', size: 2 },
    { name: 'channels', size: 2 },
    { name: 'sample_rate', size: 4 },
    { name: 'byte_rate', size: 4 },
    { name: 'block_align', size: 2 },
    { name: 'bits_per_sample', size: 2 },
    { name: 'data_header', size: 4, type: 'string' },
    { name: 'file_size', size: 4 }
];

function readString(buffer, offset, length) {
    return String.fromCharCode(...[...buffer.subarray(offset,offset+length).values()])
}

const convertRange = (options) => {
    const { old_min, old_max, new_min, new_max, value } = options;
    const old_range = old_max - old_min;
    const new_range = new_max - new_min;
    return (((value - old_min) * new_range) / old_range) + new_min;
}

function getHeaderData(options) {
    const { buffer } = options;    

    let offset = 0;
    const headerData = {};
    ABSTRACT_HEADER_TABLE.forEach((item) => {
        const { name, size, type = '' } = item;

        headerData[name] = 
            type === 'string' ? 
            readString(buffer, offset, size) : 
            buffer[HEADER_READERS[size]](offset);
        offset += size;
    });

    const {
        riff,
        bits_per_sample,
        channels,
        sample_rate,
        block_align,
        byte_rate,
        fmt_type
    } = headerData;

    // sanity checks
    assert(SUPPORTED_ENCODINGS.includes(fmt_type), `Encoding format [${fmt_type}] is not supported!`);
    assert(typeof riff === 'string' && riff.toLowerCase() === 'riff', '[riff] value did not match expected string');
    assert(44 == offset, 'Header data read length is wrong');
    assert((bits_per_sample * channels) / 8 === block_align, '[(bits_per_sample * channels) / 8] did not match [block_align]');
    assert((sample_rate * channels * bits_per_sample) / 8 === byte_rate, '[(sample_rate * channels * bits_per_sample) / 8] did not match [byte_rate]');

    return headerData;
}

function getAmplitudeData(options) {
    const { buffer, headerData } = options;

    const { fmt_type, bits_per_sample, file_size, sample_rate, channels } = headerData;

    const readerFunction = DATA_READERS[`${fmt_type}-${bits_per_sample}`];

    const bytesPerSample = bits_per_sample / 8;
    const totalSamples = file_size / bytesPerSample / channels;

    let offset = 44;
    const amplitudeData = [[],[]];
    for (let i = 0; i < totalSamples; i++) {
        for (let j = 0; j < channels; j++) {
            amplitudeData[j].push(buffer[readerFunction](offset))
            offset += bytesPerSample;
        }
    }

    console.log(totalSamples, totalSamples / sample_rate)
    return amplitudeData[1].length === 0 ? [amplitudeData[0]] : amplitudeData;
}

function normalizeDataToFrames(options) {
    const { amplitudeData, headerData, frameRate, frameHeight, frameWidth } = options;
    const { sample_rate } = headerData; 

    for (channel of amplitudeData) {
        

    }

}

// const filePath = './test_files/8_unsigned_stereo.wav';
// const filePath = './test_files/32_float_stereo.wav';
const filePath = './test_files/32_signed_stereo.wav';
const buffer = fs.readFileSync(filePath); 

const headerData = getHeaderData({ buffer });
console.log(headerData);
const amplitudeData = getAmplitudeData({ headerData, buffer });
console.log(amplitudeData);

// const normalizedData = normalizeDataToFrames({ headerData, amplitudeData, frameRate: FRAME_RATE, frameHeight: FRAME_HEIGHT, frameWidth: FRAME_WIDTH });







