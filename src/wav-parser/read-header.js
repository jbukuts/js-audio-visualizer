import assert from 'assert';

const SUPPORTED_ENCODINGS = [1, 3, 65534];

const HEADER_READERS = {
    'RIFF': {
        'u_int': {
            1: 'readUInt8',
            2: 'readUInt16LE',
            4: 'readUInt32LE',
        },
        'float': {
            4: 'readFloatLE'
        },
        'string': new Proxy({}, {
            get() { return 'readString' }
        })
    },
    // https://stackoverflow.com/questions/55341596/endianness-in-wav-files
    'RIFX': {
        'u_int': {
            1: 'readUInt8',
            2: 'readUInt16BE',
            4: 'readUInt32BE',
        },
        'float': {
            4: 'readFloatBE'
        },
        'string': new Proxy({}, {
            get() { return 'toString' }
        })
    }
}

const COMMON_CHUNK = [
    { name: 'riff_chunk_id', size: 4, type: 'string' },
    { name: 'riff_chunk_size', size: 4 },
    { name: 'file_type', size: 4, type: 'string' }
]

const FMT_CHUNK = {
    16: [
        { name: 'fmt_chunk_id', size: 4, type: 'string' },
        { name: 'fmt_chunk_size', size: 4 },
        { name: 'fmt_type', size: 2 },
        { name: 'channels', size: 2 },
        { name: 'sample_rate', size: 4 },
        { name: 'byte_rate', size: 4 },
        { name: 'block_align', size: 2 },
        { name: 'bits_per_sample', size: 2 },
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
        { name: 'timestamp', size: 4},
        { name: 'l_channel_peak_value', size: 4, type: 'float' },
        { name: 'l_channel_peak_pos', size: 4},
        { name: 'r_channel_peak_value', size: 4, type: 'float' },
        { name: 'r_channel_peaker_pos', size: 4},
    ]
}

const DATA_CHUNK = new Proxy({}, {
    get() {
        return [
            { name: 'data_chunk_id', size: 4, type: 'string' },
            { name: 'data_chunk_size', size: 4 }
        ]
    }
});

const CHUNK_MAP = {
    'fmt ': FMT_CHUNK,
    'fact': FACT_CHUNK,
    'PEAK': PEAK_CHUNK,
    'data': DATA_CHUNK
}

const GENERIC_CHUNK_START = [
    { name: 'chunk_id', size: 4, type: 'string'}, 
    { name: 'chunk_size', size: 4 }
]

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
}

function GenericChunk(id, size) {
    this.id = id;
    this.size = size;
}

export default function getHeaderData(options) {
    const { buffer } = options; 
    
    let offset = 0;
    let header_data = {};

    // read common data
    const common_data = readFromTable({ buffer, table: COMMON_CHUNK, inital_offset: offset });
    header_data = Object.assign(header_data, common_data.data);
    offset = common_data.new_offset;

    // chunk time
    let is_done = false
    while(is_done !== true) {
        let { data: generic_data } = readFromTable({ buffer, table: GENERIC_CHUNK_START, inital_offset: offset });
        
        const { chunk_id, chunk_size } = generic_data;
        console.table(new GenericChunk(chunk_id, chunk_size));

        const abstract_table = CHUNK_MAP[chunk_id][chunk_size];
        const chunk_data = readFromTable({ buffer, table: abstract_table, inital_offset: offset });
        header_data[`${chunk_id.toLowerCase().trim()}_chunk`] = chunk_data.data;

        offset = chunk_data.new_offset;

        if (chunk_id === 'data') is_done = true;
    }

    sanityCheck(header_data);
    return { header_data, offset };
}

function sanityCheck(header_data) {
    const {
        riff_chunk_id,
        fmt_chunk: {
            bits_per_sample,
            channels,
            sample_rate,
            block_align,
            byte_rate,
            fmt_type
        }
    } = header_data;

    assert(SUPPORTED_ENCODINGS.includes(fmt_type), `Encoding format [${fmt_type}] is not supported!`);
    assert(typeof riff_chunk_id === 'string' && riff_chunk_id.toLowerCase() === 'riff', '[riff_chunk_id] value did not match expected string');
    assert((bits_per_sample * channels) / 8 === block_align, '[(bits_per_sample * channels) / 8] did not match [block_align]');
    assert((sample_rate * channels * bits_per_sample) / 8 === byte_rate, '[(sample_rate * channels * bits_per_sample) / 8] did not match [byte_rate]');
}