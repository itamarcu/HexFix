console.log("HexFix is setting up...");

// shem hex black magic

const grid_size = 100;  // change this if this doesn't suit you; I am lazy!
const hex_size = grid_size / 2;

function cube_round(cube) {
    let rx = Math.round(cube.x);
    let ry = Math.round(cube.y);
    let rz = Math.round(cube.z);

    const x_diff = Math.abs(rx - cube.x);
    const y_diff = Math.abs(ry - cube.y);
    const z_diff = Math.abs(rz - cube.z);

    if (x_diff > y_diff && x_diff > z_diff)
        rx = -ry-rz;
    else if (y_diff > z_diff)
        ry = -rx-rz;
    else
        rz = -rx-ry;
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
    const q = (2. / 3 * point.x) / hex_size;
    const r = (-1. / 3 * point.x + Math.sqrt(3) / 3 * point.y) / hex_size;
    return hex_round({q, r})
}

function flat_hex_to_pixel(hex) {
    const x = hex_size * (3. / 2 * hex.q);
    const y = hex_size * (Math.sqrt(3) / 2 * hex.q + Math.sqrt(3) * hex.r);
    return {x, y}
}

function pixel_to_hex_to_pixel_but_hex_centered(point) {
    const x = point.x + 50;
    const y = point.y + 86.60254037844386/2;
    const snapped = flat_hex_to_pixel(pixel_to_flat_hex({x, y}));
    const newx = snapped.x - 50;
    const newy = snapped.y - 86.60254037844386/2;
    return {x: newx, y: newy}
}

_onDragLeftDrop_Fixed = (event) => {
    const clones = event.data.clones || [];
    const updates = clones.reduce((updates, c) => {

        // Get the snapped destination coordinates
        let dest = {x: c.data.x, y: c.data.y};
        if (!event.data.originalEvent.shiftKey) {
            dest = canvas.grid.getSnappedPosition(c.data.x, c.data.y);
            // HEXFIX
            dest = pixel_to_hex_to_pixel_but_hex_centered(dest)
        }

        // Test collision for each moved token vs the central point of it's destination space
        if ( !game.user.isGM ) {
            let target = c.getCenter(dest.x, dest.y);
            let collides = c.checkCollision(target);
            if ( collides ) {
                ui.notifications.error(game.i18n.localize("ERROR.TokenCollide"));
                return updates
            }
        }

        // Perform updates where no collision occurs
        updates.push({_id: c._original.id, x: dest.x, y: dest.y});
        return updates;
    }, []);
    return canvas.scene.updateEmbeddedEntity(this.constructor.name, updates);
};

Hooks.on("ready", function() {
    Token.prototype._onDragLeftDrop = _onDragLeftDrop_Fixed;
    console.log("HexFix is done setting up!");
});