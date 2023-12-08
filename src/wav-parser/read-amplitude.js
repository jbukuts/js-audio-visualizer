// 1 - Integer PCM
// 3 - Float PCM
// eslint-disable-next-line no-unused-vars
const SUPPORTED_ENCODINGS = [1, 3];

const A_LAW_LOOKUP = [
  -32124, -31100, -30076, -29052, -28028, -27004, -25980, -24956, -23932, -22908, -21884, -20860,
  -19836, -18812, -17788, -16764, -15996, -15484, -14972, -14460, -13948, -13436, -12924, -12412,
  -11900, -11388, -10876, -10364, -9852, -9340, -8828, -8316, -7932, -7676, -7420, -7164, -6908,
  -6652, -6396, -6140, -5884, -5628, -5372, -5116, -4860, -4604, -4348, -4092, -3900, -3772, -3644,
  -3516, -3388, -3260, -3132, -3004, -2876, -2748, -2620, -2492, -2364, -2236, -2108, -1980, -1884,
  -1820, -1756, -1692, -1628, -1564, -1500, -1436, -1372, -1308, -1244, -1180, -1116, -1052, -988,
  -924, -876, -844, -812, -780, -748, -716, -684, -652, -620, -588, -556, -524, -492, -460, -428,
  -396, -372, -356, -340, -324, -308, -292, -276, -260, -244, -228, -212, -196, -180, -164, -148,
  -132, -120, -112, -104, -96, -88, -80, -72, -64, -56, -48, -40, -32, -24, -16, -8, 0, 32124,
  31100, 30076, 29052, 28028, 27004, 25980, 24956, 23932, 22908, 21884, 20860, 19836, 18812, 17788,
  16764, 15996, 15484, 14972, 14460, 13948, 13436, 12924, 12412, 11900, 11388, 10876, 10364, 9852,
  9340, 8828, 8316, 7932, 7676, 7420, 7164, 6908, 6652, 6396, 6140, 5884, 5628, 5372, 5116, 4860,
  4604, 4348, 4092, 3900, 3772, 3644, 3516, 3388, 3260, 3132, 3004, 2876, 2748, 2620, 2492, 2364,
  2236, 2108, 1980, 1884, 1820, 1756, 1692, 1628, 1564, 1500, 1436, 1372, 1308, 1244, 1180, 1116,
  1052, 988, 924, 876, 844, 812, 780, 748, 716, 684, 652, 620, 588, 556, 524, 492, 460, 428, 396,
  372, 356, 340, 324, 308, 292, 276, 260, 244, 228, 212, 196, 180, 164, 148, 132, 120, 112, 104, 96,
  88, 80, 72, 64, 56, 48, 40, 32, 24, 16, 8, 0
];

Buffer.prototype.readString = function (offset, length) {
  return String.fromCharCode(...[...this.subarray(offset, offset + length).values()]);
};

// inversing A-law encoded data  back to 16-bit
// https://en.wikipedia.org/wiki/A-law_algorithm
Buffer.prototype.readALawData = function (offset, a = 87.6) {
  const compression_log = 1 + Math.log(a);
  const value = this.readUInt8(offset);

  // piece-wise representation
  // eslint-disable-next-line no-unused-vars
  const one = (y) => (Math.sign(y) * (Math.abs(y) * compression_log)) / a;
  // eslint-disable-next-line no-unused-vars
  const two = (y) =>
    (Math.sign(y) * Math.pow(Math.E, Math.abs(y) * compression_log - 1)) / [a + a * Math.log(a)];

  // return Math.abs(value) < (1 / compression_log) ? one(value) : two(value);
  return A_LAW_LOOKUP[value];
};

// map instrcuting how data is read from WAV file
const DATA_READERS = {
  RIFF: {
    1: {
      8: 'readUInt8',
      16: 'readInt16LE',
      24: 'readInt24LE',
      32: 'readInt32LE'
    },
    3: {
      32: 'readFloatLE',
      64: 'readDoubleLE'
    },
    6: {
      8: 'readALawData'
    }
  },
  RIFX: {
    1: {
      1: {
        8: 'readUInt8',
        16: 'readInt16BE',
        24: 'readInt24BE',
        32: 'readInt32BE'
      },
      3: {
        32: 'readFloatBE',
        64: 'readDoubleBE'
      }
    },
    3: {},
    65534: {}
  }
};

/**
 * Reads amplitude data from input WAV file buffer
 * @param {Object} options
 * @param {Buffer} options.buffer buffer representing byte data of input WAV file
 * @param {import("./read-header").HeaderData} options.header_data header data associated with input file
 * @param {number} options.starting_offset byte offset to start reading data from buffer
 * @returns {number[][]}
 */
export default function getAmplitudeData(options) {
  const { buffer, header_data, starting_offset } = options;

  const {
    riff_chunk_id,
    fmt_chunk: { fmt_type, bits_per_sample, channels, sub_code },
    derived_data: { bytes_per_sample, total_samples }
  } = header_data;

  const format_code = fmt_type === 65534 ? sub_code : fmt_type;
  const reader_func = DATA_READERS[riff_chunk_id][format_code][bits_per_sample];

  let offset = starting_offset;
  const amplitude_data = [...new Array(channels)].map(() => new Array(total_samples));
  for (let i = 0; i < total_samples; i++) {
    for (let j = 0; j < channels; j++) {
      const value = buffer[reader_func](offset);
      amplitude_data[j][i] = value;
      offset += bytes_per_sample;
    }
  }

  if (amplitude_data[1].length === 0) {
    amplitude_data.splice(1, 1);
  }

  return amplitude_data;
}
