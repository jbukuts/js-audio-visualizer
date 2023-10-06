
export default class PGMFile {
    image_data;
    pixel_array;
    height;
    width;

    constructor(options) {
        const { width, height } = options;

        // this.pixel_array = new Array(width).fill(new Array(height).fill(0));
        this.pixel_array = new Uint8Array(width*height);
        this.height = height;
        this.width = width;
    }
    
    drawPoint(options) {
        const { x, y, value } = options;
        this.pixel_array[(y * this.width) + x] = value;
    }

    toFileBuffer() {
        const header = `P2\n#create by jbukuts\n${this.width} ${this.height}\n255\n`;
        // let image_string = '';
        // for (let x = 0; x < this.height; x++) {
        //     for (let y = 0; y < this.width; y++) {
        //         image_string += `${this.pixel_array[x*y]} `
        //     }
        //     image_string += '\n';
        // }

        return Buffer.from(header + this.pixel_array.join(' '));
    }

}