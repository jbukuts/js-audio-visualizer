import ImageFile from '../ImageFile.js';

/**
 * Class implementing PGM file
 *
 * @class
 * @extends ImageFile
 */
export default class PGMFile extends ImageFile {
  image_data;

  constructor(options) {
    super(options);
  }

  drawPoint(options) {
    const { x, y, value = 255 } = options;
    this.pixel_data[y * this.width + x] = value;
  }

  toFileBuffer() {
    const header = `P2\n#created by jbukuts\n${this.width} ${this.height}\n255\n`;
    return Buffer.from(header + this.pixel_data.join(' '));
  }
}
