const { parentPort } = require('worker_threads');
const fs = require('fs');
const { createCanvas } = require('canvas');
const path = require('path');

parentPort.on('message', async (msg) => {
    const { 
        arr, 
        type, 
        frame_number, 
        points_per_frame, 
        frame_folder, 
        digit_len, 
        screen_width, 
        screen_height, 
        point_spacing 
    } = msg;


    const canvas = createCanvas(screen_width, screen_height);
    console.log(canvas);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = "black";

    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";

    for (let p = 0; p < points_per_frame; p++) {
        const y_value = arr[(frame_number * points_per_frame) + p];
        const x_value = p * point_spacing;
        ctx.fillRect(x_value, y_value, 5, 5);
    }

    const image_buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(frame_folder, `frame-${String(frame_number).padStart(digit_len, '0')}.png`), image_buffer);
    
    
    parentPort.postMessage('done');

});