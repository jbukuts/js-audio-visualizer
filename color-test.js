import Crayons, { SUPPORTED_COLORS, SUPPORTED_STYLES } from './src/crayon-box/crayon-box.js';

console.log('Rainbow Test');

SUPPORTED_COLORS.forEach((color) => {
  console.log(
    ...SUPPORTED_STYLES.map((style) => Crayons[color](style, { style })),
    Crayons[color]('high_intensity', { high_intensity: true }),
    Crayons[color]('background', { bg: true, style: 'bold' })
  );
});
