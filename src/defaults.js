import os from 'os';

const defaults = {
  TEMP_DIR: os.tmpdir(),
  DEF_OUTPUT_PATH: './test.mp4',
  DEF_IMAGE_FILE: 'bmp',
  DEF_FRAME_RATE: 24,
  DEF_FRAME_HEIGHT: 720,
  DEF_FRAME_WIDTH: 1280,
  DEF_THREADING: os.cpus().length,
  SRC_PATH: import.meta.url
};

export default defaults;
