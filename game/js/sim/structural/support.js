"use strict";

/**
 * game/js/sim/structural/support.js
 *
 * Project DEUS Structural Support Engine (NAT.02.01).
 * Computes compressive vertical load transmission and horizontal tensile cantilever spans.
 */

function evalCellSupport(cellData, material, neighborBelow, neighborHoriz) {
    // 0. Intrinsic ground anchor (bedrock or terrain foundation)
    if (cellData && (cellData.groundAnchor || cellData.isBedrock)) {
        return {
            supported: true,
            mode: "ground",
            span: 0
        };
    }

    // 1. Vertical compressive support: resting on a solid, supported cell below
    if (neighborBelow && neighborBelow.solid && neighborBelow.supported) {
        return {
            supported: true,
            mode: "vertical",
            span: 0
        };
    }

    // 2. Horizontal cantilever support: anchored to an adjacent solid, supported cell on the same level
    if (material && material.tensileYield && material.density) {
        const maxCantileverSpan = Math.floor(material.tensileYield / (material.density * 10));
        if (neighborHoriz && neighborHoriz.solid && neighborHoriz.supported) {
            const currentX = cellData && cellData.position ? cellData.position.x : 0;
            const anchorX = neighborHoriz && neighborHoriz.position ? neighborHoriz.position.x : 0;
            const span = Math.abs(currentX - anchorX);

            if (span <= maxCantileverSpan) {
                return {
                    supported: true,
                    mode: "cantilever",
                    span: span
                };
            }
        }
    }

    // 3. Unsupported overhang or ceiling pocket
    return {
        supported: false,
        mode: "unsupported",
        span: 0
    };
}

module.exports = {
    evalCellSupport
};
