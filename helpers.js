const convertRange = (options) => {
    const { old_min, old_max, new_min, new_max, value } = options;
    const old_range = old_max - old_min;
    const new_range = new_max - new_min;
    return Math.floor((((value - old_min) * new_range) / old_range) + new_min);
}

export { convertRange }