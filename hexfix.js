console.log("HexFix is setting up...");

// I am lazy so these constants assume a flat hex map of size 100
const grid_size = 100;
const hex_side = grid_size / 2; // length of each of the six sides
const grid_width = grid_size; // width from left to right (point to point)
const grid_height = grid_size * Math.sqrt(3) / 2; // height from top to bottom (flat to flat)

function cube_round(cube) {
    let rx = Math.round(cube.x);
    let ry = Math.round(cube.y);
    let rz = Math.round(cube.z);

    const x_diff = Math.abs(rx - cube.x);
    const y_diff = Math.abs(ry - cube.y);
    const z_diff = Math.abs(rz - cube.z);

    if (x_diff > y_diff && x_diff > z_diff)
        rx = -ry - rz;
    else if (y_diff > z_diff)
        ry = -rx - rz;
    else
        rz = -rx - ry;
    return {x: rx, y: ry, z: rz}
}

function hex_round(hex) {
    return cube_to_axial(cube_round(axial_to_cube(hex)))
}

function cube_to_axial(cube) {
    const q = cube.x;
    const r = cube.z;
    return {q: q, r: r}
}

function axial_to_cube(hex) {
    const x = hex.q;
    const z = hex.r;
    const y = -x - z;
    return {x: x, y: y, z: z}
}

function pixel_to_flat_hex(point) {
    const q = (2. / 3 * point.x) / hex_side;
    const r = (-1. / 3 * point.x + Math.sqrt(3) / 3 * point.y) / hex_side;
    return hex_round({q, r})
}

function flat_hex_to_pixel(hex) {
    const x = hex_side * (3. / 2 * hex.q);
    const y = hex_side * (Math.sqrt(3) / 2 * hex.q + Math.sqrt(3) * hex.r);
    return {x, y}
}

function pixel_to_hex_to_pixel_but_hex_centered(point) {
    const x = point.x + grid_width;
    const y = point.y + grid_height / 2;
    const snapped = flat_hex_to_pixel(pixel_to_flat_hex({x, y}));
    const newx = snapped.x - grid_width;
    const newy = snapped.y - grid_height / 2;
    return {x: newx, y: newy}
}

function _onDragLeftDrop_Fixed(event) {
    const clones = event.data.clones || [];
    const updates = clones.reduce((updates, c) => {

        // Get the snapped destination coordinates
        let dest = {x: c.data.x, y: c.data.y};
        if (!event.data.originalEvent.shiftKey) {
            // HEXFIX
            const halfWidth = c.data.width/2 * grid_width;
            const halfHeight = c.data.height/2 * grid_height;
            const draggedCenter = {
                x: c.data.x + halfWidth,
                y: c.data.y + halfHeight,
            };
            const snappedCenter = pixel_to_hex_to_pixel_but_hex_centered(draggedCenter);
            dest = {
                x: snappedCenter.x - halfWidth,
                y: snappedCenter.y - halfHeight,
            }
        }

        // Test collision for each moved token vs the central point of it's destination space
        if (!game.user.isGM) {
            let target = c.getCenter(dest.x, dest.y);
            let collides = c.checkCollision(target);
            if (collides) {
                ui.notifications.error(game.i18n.localize("ERROR.TokenCollide"));
                return updates
            }
        }

        // Perform updates where no collision occurs
        updates.push({_id: c._original.id, x: dest.x, y: dest.y});
        return updates;
    }, []);
    return canvas.scene.updateEmbeddedEntity(this.constructor.name, updates);
}

function _getShiftedPosition_Fixed(dx, dy) {
    let [x, y] = canvas.grid.grid.shiftPosition(this.data.x, this.data.y, dx, dy);
    let targetCenter = this.getCenter(x, y);
    let collide = this.checkCollision(targetCenter);
    // HEXFIX
    // If token is not aligned with grid, keep same "misalignment".
    // This way, smaller centered tokens will remain centered!
    let snapped = canvas.grid.getSnappedPosition(this.data.x, this.data.y);
    x += this.data.x - snapped.x;
    y += this.data.y - snapped.y;
    //
    return collide ? {x: this.data.x, y: this.data.y} : {x, y};
}

Hooks.on("init", function () {
    Token.prototype._onDragLeftDrop = _onDragLeftDrop_Fixed;
    Token.prototype._getShiftedPosition = _getShiftedPosition_Fixed;
    console.log("HexFix is done setting up!");
});