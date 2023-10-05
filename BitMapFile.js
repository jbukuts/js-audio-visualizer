const DEF_PALETTE = [
    new Uint8Array([255, 255, 255]),
    new Uint8Array([0, 0, 0])
];


function createHeader(options) {
    const { file_size, data_offset } = options;

    return [
        { name: 'signature', size: 2, type: 'string', value: 'BM' },
        { name: 'file_size', size: 4, value: file_size },
        { name: 'reserved', size: 4, value: 0 },
        { name: 'data_offset', size: 4, value: data_offset }
    ]
}

function createInfoChunk(options) {
    const { width, height, bits_per_pixel } = options;

    return [
        { name: 'chunk_size', size: 4, value: 40 },
        { name: 'width', size: 4, value: width },
        { name: 'height', size: 4, value: height },
        { name: 'planes', size: 2, value: 1 },
        { name: 'bits_per_pixel', size: 2, value: bits_per_pixel },
        { name: 'compression', size: 4, value: 0 },
        { name: 'image_size', size: 4, value: 0 },
        { name: 'x_pixel_per_m', size: 4, value: 1 },
        { name: 'y_pixel_per_m', size: 4, value: 1 },
        { name: 'colors_used', size: 4, value: Math.pow(2,bits_per_pixel) },
        { name: 'important_colors', size: 4, value: 0 }
    ]
}

function createColorTable(options) {
    const { palette } = options;

    


}

function writeChunk(options) {
    const { buffer } = options;




}

class BitMapFile {
    pixel_data;
    image_data;
    color_palette;

    constructor(options) {
        const { width, height, bits_per_pixel = 1, palette = DEF_PALETTE} = options;
        const num_colors = Math.pow(2, bits_per_color);

        if (num_colors !== palette.length) 
            throw new Error(`Ensure palette contains ${num_colors} colors`);


        this.color_palette = palette;
        this.image_data = {
            bits_per_pixel,
            width,
            height
        };

    }

    drawCircle(options) {
        const { x, y, radius } = options;
    }
    
    toFileBuffer() {
        const { width, height, bits_per_pixel } = this.image_data;
        const total_pixels = width * height;
        const buffer_byte_size = 
            14 + 40 + 
            (4 * this.color_palette.length) + 
            ((bits_per_pixel * total_pixels) / Uint8Array.BYTES_PER_ELEMENT);

        const image_buffer = Buffer.alloc(buffer_byte_size);

        let offset = 0;

        image_buffer.write('BM', 0);
        offset

        return image_buffer;
    }
}