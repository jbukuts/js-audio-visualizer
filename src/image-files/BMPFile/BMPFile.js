import ImageFile from '../ImageFile.js';
import { createHeaderChunk, createInfoChunk, writeChunk } from './helpers.js';

const DEF_PALETTE = [new Uint8Array([0, 0, 0]), new Uint8Array([255, 255, 255])];

/**
 * Class implementing BMP file
 *
 * @class
 * @extends ImageFile
 */
export default class BMPFile extends ImageFile {
  /** @type {number[]} */
  color_palette;

  /** @type {number} */
  bits_per_pixel;

  constructor(options) {
    const { bits_per_pixel = 1, palette = DEF_PALETTE } = options;

    // ensure palette size matches bit encoding
    const num_colors = Math.pow(2, bits_per_pixel);
    if (num_colors !== palette.length)
      throw new Error(`Ensure palette contains ${num_colors} colors`);

    super(options);
    this.color_palette = palette;
    this.bits_per_pixel = bits_per_pixel;
  }

  drawPoint(options) {
    const { x, y, value = 1 } = options;
    this.pixel_data[(this.height - y) * this.width + x] = value;
  }

  toFileBuffer() {
    const scan_line = ((this.width * this.bits_per_pixel) / 8) % 4;
    const padding_needed = scan_line === 0 ? 0 : 4 - scan_line;
    const total_pixels = this.width * this.height;

    // calculate buffer byte size and create buffer
    const header_size = 14;
    const info_size = 40;
    const palette_size = 4 * this.color_palette.length;
    const data_size = (this.bits_per_pixel * total_pixels) / 8 + padding_needed * this.height;
    const buffer_byte_size = header_size + info_size + palette_size + data_size;
    const image_buffer = Buffer.alloc(buffer_byte_size);

    // create header chunk
    const header_chunk = createHeaderChunk({
      file_size: buffer_byte_size,
      data_offset: header_size + info_size + palette_size
    });

    // create info chunk
    const info_chunk = createInfoChunk({
      width: this.width,
      height: this.height,
      bits_per_pixel: this.bits_per_pixel
    });

    // create palette chunk
    const palette_chunk = this.color_palette.reduce(
      (acc, [r, g, b]) => [
        ...acc,
        { name: 'blue', size: 1, value: b },
        { name: 'green', size: 1, value: g },
        { name: 'red', size: 1, value: r },
        { name: 'reserved', size: 1, value: 0 }
      ],
      []
    );

    // write chunks to buffer
    let offset = writeChunk({
      buffer: image_buffer,
      chunk: [...header_chunk, ...info_chunk, ...palette_chunk],
      start_offset: 0
    });

    // write pixel data to buffer
    const inc = 8 / this.bits_per_pixel;
    for (let i = 0; i < this.pixel_data.length; i += inc) {
      const slice = this.pixel_data.slice(i, i + inc);
      const bin_rep = slice.reduce((acc, curr) => {
        return acc + curr.toString(2).padStart(0, '0');
      }, '');

      const as_int = parseInt(bin_rep, 2);
      offset = image_buffer.writeUInt8(as_int, offset);

      if (i !== 0 && i % this.width === 0) {
        for (let p = 0; p < padding_needed; p++) {
          offset = image_buffer.writeUInt8(0, offset);
        }
      }
    }

    return image_buffer;
  }
}
