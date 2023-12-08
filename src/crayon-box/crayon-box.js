/**
 * @typedef {"black" | "red" | "green" | "yellow" | "blue" | "purple" | "cyan" | "white"} Color
 * @typedef {"normal" | "bold" | "dim" | "italics" | "underline" | "blink" | "inverse" | "invisible" | "strike"} Style
 */

const INTENSITY_SHIFT = 60;
const BG_SHIFT = 10;
const ESCAPE = '\x1b[0m';

/** @type {Record<Color, number>} */
const COLORS = {
  black: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  purple: 35,
  cyan: 36,
  white: 37
};

/** @type {Record<Style, number>} */
const STYLES = {
  normal: 0,
  bold: 1,
  dim: 2,
  italics: 3,
  underline: 4,
  blink: 5,
  inverse: 7,
  invisible: 8,
  strike: 9
};

/**
 * @typedef {{
 *  style?: Style,
 *  high_intensity?: boolean,
 *  bg?: boolean
 * }} ColorOptions
 */

/**
 * Helper function to appy color to text
 * @function
 * @name colorHandler
 * @param {string} text - text to colorize
 * @param {Color} color - color to apply to text
 * @param {ColorOptions} options - options for styling text
 * @returns {string}
 */
function colorHandler(text, color, options = {}) {
  const { style = 'normal', high_intensity = false, bg = false } = options;

  const int_shift = high_intensity ? INTENSITY_SHIFT : 0;
  const bg_shift = bg ? BG_SHIFT : 0;

  const style_code = `[${STYLES[style]};`;
  const color_code = COLORS[color.toLowerCase()] + int_shift + bg_shift;
  const full_code = `\x1b${style_code}${color_code}m`;

  const final_string = `${full_code}${text}`.split(ESCAPE).join(`${ESCAPE}${full_code}`);
  return `${final_string}${ESCAPE}`;
}

/**
 * The crayon box
 * @returns {Record<Color, (text: string, options?: ColorOptions) => string>}
 */
function Crayons() {
  const crayonCache = new Map();

  return new Proxy(
    {},
    {
      get(_, color) {
        if (!(color in COLORS)) throw new Error(`Color ${color} not valid`);

        if (!crayonCache.has(color)) {
          crayonCache.set(color, (text, options) => colorHandler(text, color, options));
        }

        return crayonCache.get(color);
      }
    }
  );
}

export const SUPPORTED_COLORS = Object.keys(COLORS);
export const SUPPORTED_STYLES = Object.keys(STYLES);
export default Crayons();
