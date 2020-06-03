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

/**
 * Will center tokens around hexagons centers correctly
 */
function _onDragLeftDrop_Fixed(event) {
    const clones = event.data.clones || [];
    const updates = clones.reduce((updates, c) => {

        // Get the snapped destination coordinates
        let dest = {x: c.data.x, y: c.data.y};
        if (!event.data.originalEvent.shiftKey) {
            // HEXFIX
            const halfWidth = c.data.width / 2 * grid_width;
            const halfHeight = c.data.height / 2 * grid_height;
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

/**
 * Will no longer snap tokens to grid when moving them with WASD; also, will move diagonals hexagonally.
 *
 * Will "skip" hexagons when going left or right (i.e. in \A/B\C/ it will move from A to C)
 */
function _getShiftedPosition_Fixed(dx, dy) {
    let change = {x: 0, y: 0};
    if (dx === 0 && dy < 0) { // ↑
        change = {x: 0, y: -1};
    } else if (dx > 0 && dy < 0) { // ↗
        change = {x: +0.75, y: -0.5};
    } else if (dx > 0 && dy === 0) { // → ("skips" a hex)
        change = {x: +1.5, y: 0};
    } else if (dx > 0 && dy > 0) { // ↘
        change = {x: +0.75, y: +0.5};
    } else if (dx === 0 && dy > 0) { // ↓
        change = {x: 0, y: +1};
    } else if (dx < 0 && dy > 0) { // ↙
        change = {x: -0.75, y: +0.5};
    } else if (dx < 0 && dy === 0) { // ← ("skips" a hex)
        change = {x: -1.5, y: 0};
    } else if (dx < 0 && dy < 0) { // ↖
        change = {x: -0.75, y: -0.5};
    } else {
        console.error("what the heck? are you in 3D space? you can't move in...", dx, dy);
        return
    }
    const x = this.data.x + change.x * grid_width;
    const y = this.data.y + change.y * grid_height;
    const targetCenter = {
        x: x + this.data.width / 2 * grid_width,
        y: y + this.data.height / 2 * grid_height,
    };
    const collide = this.checkCollision(targetCenter);
    return collide ? {x: this.data.x, y: this.data.y} : {x, y};
}

/**
 * Will now zoom around cursor.
 */
function _onMouseWheel_Fixed(event) {
    let dz = ( event.deltaY < 0 ) ? 1.05 : 0.95;
    const scale = dz * canvas.stage.scale.x;
    const d = canvas.dimensions;
    const max = CONFIG.Canvas.maxZoom;
    const ratio = Math.max(d.width / window.innerWidth, d.height / window.innerHeight, max);
    if (scale > ratio || scale < 1/ratio) {
        console.log(`scale limit reached (${scale}).`)
        return
    }
    // Acquire the cursor position transformed to Canvas coordinates
    const t = canvas.stage.worldTransform;
    const dx = ((-t.tx + event.clientX)/canvas.stage.scale.x - canvas.stage.pivot.x) * (dz - 1);
    const dy = ((-t.ty + event.clientY)/canvas.stage.scale.y - canvas.stage.pivot.y) * (dz - 1);
    const x = canvas.stage.pivot.x + dx;
    const y = canvas.stage.pivot.y + dy;
    canvas.pan({x, y, scale});
}

Hooks.on("init", function () {
    Token.prototype._onDragLeftDrop = _onDragLeftDrop_Fixed;
    Token.prototype._getShiftedPosition = _getShiftedPosition_Fixed;
    Canvas.prototype._onMouseWheel = _onMouseWheel_Fixed;
    console.log("HexFix is done setting up!");
});