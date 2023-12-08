const writers = {
  string: new Proxy(
    {},
    {
      get() {
        return 'write';
      }
    }
  ),
  float: {
    4: 'writeFloatLE'
  },
  u_int: {
    1: 'writeUInt8',
    2: 'writeUInt16LE',
    3: 'writeUInt24LE',
    4: 'writeUInt32LE'
  }
};

/**
 * @typedef {Object} ChunkItem
 * @prop {string} name name of item
 * @prop {number} size byte size of item
 * @prop {number | string} value value of item
 */

/**
 * Build header chunk of BMP file from input data
 *
 * @param {Object} options
 * @param {number} options.file_size
 * @param {number} options.data_offset
 * @returns {ChunkItem[]} represents header chunk of BMP file
 */
function createHeaderChunk(options) {
  const { file_size, data_offset } = options;

  return [
    { name: 'signature', size: 2, type: 'string', value: 'BM' },
    { name: 'file_size', size: 4, value: file_size },
    { name: 'reserved', size: 4, value: 0 },
    { name: 'data_offset', size: 4, value: data_offset }
  ];
}

/**
 * Build info chunk of BMP file from input data
 *
 * @param {Object} options
 * @param {number} options.width
 * @param {number} options.height
 * @param {number} options.bits_per_pixel
 * @param {number} [options.planes=1]
 * @returns {ChunkItem[]} represents info chunk of BMP file
 */
function createInfoChunk(options) {
  const { width, height, bits_per_pixel, planes = 1 } = options;

  return [
    { name: 'chunk_size', size: 4, value: 40 },
    { name: 'width', size: 4, value: width },
    { name: 'height', size: 4, value: height },
    { name: 'planes', size: 2, value: planes },
    { name: 'bits_per_pixel', size: 2, value: bits_per_pixel },
    { name: 'compression', size: 4, value: 0 },
    { name: 'image_size', size: 4, value: 0 },
    { name: 'x_pixel_per_m', size: 4, value: 10 },
    { name: 'y_pixel_per_m', size: 4, value: 10 },
    { name: 'colors_used', size: 4, value: Math.pow(2, bits_per_pixel) },
    { name: 'important_colors', size: 4, value: 0 }
  ];
}

/**
 * Write chunk to file buffer
 *
 * @param {Object} options
 * @param {Buffer} options.buffer buffer representing image file
 * @param {ChunkItem} options.chunk chunk to write to file buffer
 * @param {number} [options.start_offset=0] offset to start writing to in buffer
 * @returns {number} byte offset after completing writes to buffer
 */
function writeChunk(options) {
  const { buffer, chunk, start_offset = 0 } = options;

  let offset = start_offset;
  chunk.forEach((item) => {
    const { size, type = 'u_int', value } = item;
    const writerFunction = writers[type][size];
    buffer[writerFunction](value, offset);
    offset += size;
  });

  return offset;
}

export { createHeaderChunk, createInfoChunk, writeChunk };
