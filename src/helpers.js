import themes from '#themes';

const { info, success } = themes;

/**
 * Converts value in one range to another
 * @param {Object} options
 * @param {number} old_min min value in old range
 * @param {number} old_max max value in old range
 * @param {number} new_min min value in new range
 * @param {number} new_max max value in new range
 * @param {number} value value to convert into new range
 * @returns {number} mapped value in new range
 */
const convertRange = (options) => {
  const { old_min, old_max, new_min, new_max, value } = options;
  const old_range = old_max - old_min;
  const new_range = new_max - new_min;
  return Math.floor(((value - old_min) * new_range) / old_range + new_min);
};

/**
 * Helper to track execution time of input function
 * @param {Function} func function to keep time for
 * @param  {...any} args args to pass to function
 * @returns {number} execution time (ms)
 */
const keepTime = async (func, ...args) => {
  const f_name = func.name;

  console.log(info('Starting'), info.bold(f_name));
  let elapsed_time = performance.now();
  const value = await func(...args);
  elapsed_time = Number.parseFloat((performance.now() - elapsed_time) / 1000).toFixed(2);
  console.log(success.bold(f_name), success(`took ${elapsed_time} sec`));

  return value;
};

export { convertRange, keepTime };
