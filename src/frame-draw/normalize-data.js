import { convertRange } from '#helpers';
import defaults from '#defaults';

const { DEF_FRAME_HEIGHT } = defaults;

/**
 * @typedef {8 | 16 | 24 | 32 | 64} ByteSize
 * @typedef {import('../wav-parser/read-header.js').HeaderData} HeaderData
 *
 */

/** @type {Record<number, Record<ByteSize, {min: number, max: number}>>} */
const MAX_VALUES = {
  // Integer
  1: {
    8: { min: 0, max: 255 },
    16: { min: -32768, max: 32767 },
    24: { min: -8388608, max: 8388607 },
    32: { min: -2147483648, max: 2147483647 }
  },
  // Floating point
  3: {
    32: { min: -1, max: 1 },
    64: { min: -1, max: 1 }
  },
  // A-law
  6: {
    8: { min: -32768, max: 32767 }
  }
};

/**
 * Maps WAV amplitude data to fit within defined screen height
 * @param {Object} options
 * @param {HeaderData} options.header_data header data of the WAV file
 * @param {number[][]} options.amplitude_data raw amplitude data for WAV file
 * @param {number=} options.screen_height desired screen height (px) for output video file
 * @returns {number[][]} normalized amplitude data for all channels
 */
export default function normalizeData(options) {
  const { header_data, amplitude_data, screen_height = DEF_FRAME_HEIGHT } = options;

  const {
    fmt_chunk: { fmt_type, bits_per_sample, channels, sub_code },
    derived_data: { total_samples }
  } = header_data;

  const format_code = fmt_type === 65534 ? sub_code : fmt_type;
  const { min, max } = MAX_VALUES[format_code][bits_per_sample];

  const normalized_data = [...new Array(channels)].map(() => new Uint16Array(total_samples));
  for (let i = 0; i < channels; i++) {
    for (let j = 0; j < total_samples; j++) {
      const new_value = convertRange({
        old_min: min,
        old_max: max,
        new_min: 0,
        new_max: screen_height,
        value: amplitude_data[i][j]
      });
      normalized_data[i][j] = screen_height - new_value;
    }
  }
  return normalized_data;
}
