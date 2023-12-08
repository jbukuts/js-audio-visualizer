/**
 * @typedef {Object} ImageFileOptions
 * @property {number} width
 * @property {number} height
 * */

/**
 * Interface for classes implementing a image file
 *
 * @class
 * @name ImageFile
 */
export default class ImageFile {
  /** @type {number} */
  width;

  /** @type {number} */
  height;

  /** @type {Uint8Array} */
  pixel_data;

  /**
   *
   * @param {Object} options
   * @param {number} options.width
   * @param {number} options.height
   */
  constructor(options) {
    const { width, height } = options;
    this.width = width;
    this.height = height;
    this.pixel_data = new Uint8Array(width * height);
  }

  /**
   * Draw a singular point in the image
   *
   * @method drawPoint
   * @param {Object} options
   * @param {number} options.x x position of point in image
   * @param {number} options.y y position of point in image
   * @param {number} options.value color to use for point
   * @returns {void}
   */
  drawPoint() {}

  /**
   * Create byte buffer representing image file
   *
   * @method toFileBuffer
   * @returns {Buffer} byte buffer of image file
   */
  toFileBuffer() {}
}
