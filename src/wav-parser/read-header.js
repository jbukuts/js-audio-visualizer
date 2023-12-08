import assert from 'assert';
import themes from '#themes';

const { warn } = themes;

const SUPPORTED_ENCODINGS = [1, 3, 65534];

/**
 * @typedef {Object} CommonChunk
 * @prop {'RIFF' | 'RIFX'} riff_chunk_id
 * @prop {number} riff_chunk_size
 * @prop {string} file_type
 */

/**
 * @typedef {Object} FmtChunk
 * @prop {'fmt '} fmt_chunk_id
 * @prop {1 | 3 | 65534} fmt_type
 * @prop {number} channels
 * @prop {number} sample_rate
 * @prop {number} byte_rate
 * @prop {number} block_align
 * @prop {number} bits_per_sample
 * @prop {number=} extension_size
 * @prop {number=} valid_bits_per_sample
 * @prop {number=} channel_mask
 * @prop {number=} sub_code
 * @prop {string=} sub_format
 */

/**
 * @typedef {Object} FactChunk
 * @prop {'fact'} fact_chunk_id
 * @prop {number} fact_chunk_size
 * @prop {number} sample_length
 */

/**
 * @typedef {Object} PeakChunk
 * @prop {'PEAK'} peak_chunk_id
 * @prop {number} peak_chunk_size
 * @prop {number} version
 * @prop {number} timestamp
 * @prop {float} l_channel_peak_value
 * @prop {number} l_channel_peak_pos
 * @prop {float} r_channel_peak_value
 * @prop {number} r_channel_peaker_pos
 */

/**
 * @typedef {Object} DataChunk
 * @prop {'data'} data_chunk_id
 * @prop {number} data_chunk_size
 */

/**
 * @typedef {Object} DerivedData
 * @prop {number} bytes_per_sample
 * @prop {number} total_samples
 * @prop {number} runtime
 * @prop {number} file_size_mb
 */

/**
 * @typedef {Object} HeaderData
 * @prop {FmtChunk} fmt_chunk
 * @prop {FactChunk} fact_chunk
 * @prop {PeakChunk} peak_chunk
 * @prop {DataChunk} data_chunk
 * @prop {DerivedData} derived_data
 */

/**
 * @typedef {Object} TableValue
 * @prop {string} name
 * @prop {number} size
 * @prop {'u_int' | 'float' | 'string'} type
 */

const HEADER_READERS = {
  RIFF: {
    u_int: {
      1: 'readUInt8',
      2: 'readUInt16LE',
      4: 'readUInt32LE'
    },
    float: {
      4: 'readFloatLE'
    },
    string: new Proxy(
      {},
      {
        get() {
          return 'readString';
        }
      }
    )
  },
  // https://stackoverflow.com/questions/55341596/endianness-in-wav-files
  RIFX: {
    u_int: {
      1: 'readUInt8',
      2: 'readUInt16BE',
      4: 'readUInt32BE'
    },
    float: {
      4: 'readFloatBE'
    },
    string: new Proxy(
      {},
      {
        get() {
          return 'toString';
        }
      }
    )
  }
};

const COMMON_CHUNK = [
  { name: 'riff_chunk_id', size: 4, type: 'string' },
  { name: 'riff_chunk_size', size: 4 },
  { name: 'file_type', size: 4, type: 'string' }
];

const FMT_CHUNK = {
  16: [
    { name: 'fmt_chunk_id', size: 4, type: 'string' },
    { name: 'fmt_chunk_size', size: 4 },
    { name: 'fmt_type', size: 2 },
    { name: 'channels', size: 2 },
    { name: 'sample_rate', size: 4 },
    { name: 'byte_rate', size: 4 },
    { name: 'block_align', size: 2 },
    { name: 'bits_per_sample', size: 2 }
  ],
  18: [
    { name: 'fmt_chunk_id', size: 4, type: 'string' },
    { name: 'fmt_chunk_size', size: 4 },
    { name: 'fmt_type', size: 2 },
    { name: 'channels', size: 2 },
    { name: 'sample_rate', size: 4 },
    { name: 'byte_rate', size: 4 },
    { name: 'block_align', size: 2 },
    { name: 'bits_per_sample', size: 2 },
    { name: 'extension_size', size: 2 }
  ],
  40: [
    { name: 'fmt_chunk_id', size: 4, type: 'string' },
    { name: 'fmt_chunk_size', size: 4 },
    { name: 'fmt_type', size: 2 },
    { name: 'channels', size: 2 },
    { name: 'sample_rate', size: 4 },
    { name: 'byte_rate', size: 4 },
    { name: 'block_align', size: 2 },
    { name: 'bits_per_sample', size: 2 },
    { name: 'extension_size', size: 2 },
    { name: 'valid_bits_per_sample', size: 2 },
    { name: 'channel_mask', size: 4 },
    { name: 'sub_code', size: 2 },
    { name: 'sub_format', size: 14, type: 'string' }
  ]
};

const FACT_CHUNK = {
  4: [
    { name: 'fact_chunk_id', size: 4, type: 'string' },
    { name: 'fact_chunk_size', size: 4 },
    { name: 'sample_length', size: 4 }
  ]
};

const PEAK_CHUNK = {
  24: [
    { name: 'peak_chunk_id', size: 4, type: 'string' },
    { name: 'peak_chunk_size', size: 4 },
    { name: 'version', size: 4 },
    { name: 'timestamp', size: 4 },
    { name: 'l_channel_peak_value', size: 4, type: 'float' },
    { name: 'l_channel_peak_pos', size: 4 },
    { name: 'r_channel_peak_value', size: 4, type: 'float' },
    { name: 'r_channel_peaker_pos', size: 4 }
  ]
};

const DATA_CHUNK = new Proxy(
  {},
  {
    get() {
      return [
        { name: 'data_chunk_id', size: 4, type: 'string' },
        { name: 'data_chunk_size', size: 4 }
      ];
    }
  }
);

const CHUNK_MAP = {
  'fmt ': FMT_CHUNK,
  fact: FACT_CHUNK,
  PEAK: PEAK_CHUNK,
  data: DATA_CHUNK
};

// each chunk starts with this data
const GENERIC_CHUNK_START = [
  { name: 'chunk_id', size: 4, type: 'string' },
  { name: 'chunk_size', size: 4 }
];

/**
 *
 * @param {Object} options
 * @param {Buffer} options.buffer Buffer to read data from
 * @param {TableValue[]} options.table table instructing how each value is read from buffer
 * @param {number} options.inital_offset starting offset to read from within buffer
 * @returns {Object}
 */
const readFromTable = (options) => {
  const { buffer, table, inital_offset = 0 } = options;

  let offset = inital_offset;
  const data = {};
  table.forEach((value) => {
    const { name, size, type = 'u_int' } = value;

    data[name] = buffer[HEADER_READERS['RIFF'][type][size]](offset, size);
    offset += size;
  });

  return { data, new_offset: offset };
};

/**
 * Reads header data from WAV file buffer
 * @param {Object} options
 * @param {Buffer} options.buffer Buffer of binary data from WAV file
 * @returns {HeaderData}
 */
export default function getHeaderData(options) {
  const { buffer } = options;

  let offset = 0;
  let header_data = {};

  // read common data chunk
  const common_data = readFromTable({ buffer, table: COMMON_CHUNK, inital_offset: offset });
  header_data = Object.assign(header_data, common_data.data);
  offset = common_data.new_offset;

  // chunk time
  let is_done = false;
  while (is_done !== true) {
    // read generic chunk data to find chunk_id
    let { data: generic_data } = readFromTable({
      buffer,
      table: GENERIC_CHUNK_START,
      inital_offset: offset
    });

    const { chunk_id, chunk_size } = generic_data;
    console.log(warn('Found chunk'), warn.bold(`${chunk_id} / ${chunk_size} bytes`));

    // once chunk_id is found read data from chunk using outlined chunk map
    const abstract_table = CHUNK_MAP[chunk_id][chunk_size];
    const chunk_data = readFromTable({ buffer, table: abstract_table, inital_offset: offset });
    header_data[`${chunk_id.toLowerCase().trim()}_chunk`] = chunk_data.data;

    // once data chunk is found then all that's left is amplitude data
    offset = chunk_data.new_offset;
    if (chunk_id === 'data') is_done = true;
  }

  // calculate some useful derived data
  const {
    fmt_chunk: { bits_per_sample, sample_rate, channels },
    data_chunk: { data_chunk_size }
  } = header_data;

  const bytes_per_sample = bits_per_sample / 8;
  const total_samples = data_chunk_size / bytes_per_sample / channels;

  // assigned common derivative data
  header_data = {
    ...header_data,
    derived_data: {
      bytes_per_sample,
      total_samples,
      runtime: Math.ceil(total_samples / sample_rate),
      file_size_mb: Number.parseFloat(data_chunk_size / 1000000)
    }
  };

  sanityCheck(header_data);
  return { header_data, offset };
}

/**
 * Helper function to assert certain known facts to ensure header is valid
 * @param {HeaderData} header_data
 */
function sanityCheck(header_data) {
  const {
    riff_chunk_id,
    fmt_chunk: { bits_per_sample, channels, sample_rate, block_align, byte_rate, fmt_type }
  } = header_data;

  assert(SUPPORTED_ENCODINGS.includes(fmt_type), `Encoding format [${fmt_type}] is not supported!`);
  assert(
    typeof riff_chunk_id === 'string' && riff_chunk_id.toLowerCase() === 'riff',
    '[riff_chunk_id] value did not match expected string'
  );
  assert(
    (bits_per_sample * channels) / 8 === block_align,
    '[(bits_per_sample * channels) / 8] did not match [block_align]'
  );
  assert(
    (sample_rate * channels * bits_per_sample) / 8 === byte_rate,
    '[(sample_rate * channels * bits_per_sample) / 8] did not match [byte_rate]'
  );
}
