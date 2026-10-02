//=============================================================================
// RPG Maker MZ - Ultima Fortress: Flow Fields
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS FlowFields] Flow Field Crowd Dynamics pathfinding.
 * @author Deepdelve Architect
 *
 * @help
 * Flow field implementation for crowd movement.
 */

(() => {
    window.UF = window.UF || {};
    window.UF.Pathfinding = window.UF.Pathfinding || {};

    const IMPASSABLE = 999999;
    
    // 8-directions matching numpad
    const DIRS = [
        { d: 1, dx: -1, dy: 1 },
        { d: 2, dx: 0, dy: 1 },
        { d: 3, dx: 1, dy: 1 },
        { d: 4, dx: -1, dy: 0 },
        { d: 6, dx: 1, dy: 0 },
        { d: 7, dx: -1, dy: -1 },
        { d: 8, dx: 0, dy: -1 },
        { d: 9, dx: 1, dy: -1 }
    ];

    class FlowField {
        constructor(width, height) {
            this.width = width;
            this.height = height;
            // Structure of Arrays
            this.integrationField = new Int32Array(width * height);
            this.vectorField = new Int8Array(width * height);
            this.targetX = -1;
            this.targetY = -1;
            this.active = false;
        }

        _getIndex(x, y) {
            return y * this.width + x;
        }

        _isValid(x, y) {
            return x >= 0 && x < this.width && y >= 0 && y < this.height;
        }

        _getPassableNeighbors(x, y) {
            const neighbors = [];
            for (let i = 0; i < DIRS.length; i++) {
                const dir = DIRS[i];
                const nx = x + dir.dx;
                const ny = y + dir.dy;
                
                if (this._isValid(nx, ny)) {
                    // Using map passability
                    // Standard RMMZ check
                    let canPass = false;
                    if (dir.d % 2 === 0) {
                        canPass = $gameMap.isPassable(x, y, dir.d);
                    } else {
                        // Diagonal
                        const horz = dir.dx > 0 ? 6 : 4;
                        const vert = dir.dy > 0 ? 2 : 8;
                        if ($gameMap.isPassable(x, y, horz) && $gameMap.isPassable(x + dir.dx, y, vert)) {
                            canPass = true;
                        } else if ($gameMap.isPassable(x, y, vert) && $gameMap.isPassable(x, y + dir.dy, horz)) {
                            canPass = true;
                        }
                    }

                    if (canPass) {
                        neighbors.push({ x: nx, y: ny, cost: (dir.d % 2 === 0) ? 10 : 14, d: dir.d });
                    }
                }
            }
            return neighbors;
        }

        generate(tx, ty) {
            this.targetX = tx;
            this.targetY = ty;
            this.active = true;

            const size = this.width * this.height;
            for (let i = 0; i < size; i++) {
                this.integrationField[i] = IMPASSABLE;
                this.vectorField[i] = 0;
            }

            if (!this._isValid(tx, ty)) return;

            const targetIdx = this._getIndex(tx, ty);
            this.integrationField[targetIdx] = 0;

            const queue = [ { x: tx, y: ty } ];
            let head = 0;

            // Dijkstra Integration Field
            while (head < queue.length) {
                const curr = queue[head++];
                const currIdx = this._getIndex(curr.x, curr.y);
                const currCost = this.integrationField[currIdx];

                const neighbors = this._getPassableNeighbors(curr.x, curr.y);
                for (let i = 0; i < neighbors.length; i++) {
                    const nb = neighbors[i];
                    const nbIdx = this._getIndex(nb.x, nb.y);
                    const newCost = currCost + nb.cost;

                    if (newCost < this.integrationField[nbIdx]) {
                        this.integrationField[nbIdx] = newCost;
                        queue.push({ x: nb.x, y: nb.y });
                    }
                }
            }

            // Vector Field
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const idx = this._getIndex(x, y);
                    if (this.integrationField[idx] === IMPASSABLE || this.integrationField[idx] === 0) {
                        continue;
                    }

                    let minCost = this.integrationField[idx];
                    let bestDir = 0;

                    const neighbors = this._getPassableNeighbors(x, y);
                    for (let i = 0; i < neighbors.length; i++) {
                        const nb = neighbors[i];
                        const nbIdx = this._getIndex(nb.x, nb.y);
                        if (this.integrationField[nbIdx] < minCost) {
                            minCost = this.integrationField[nbIdx];
                            bestDir = nb.d;
                        }
                    }

                    this.vectorField[idx] = bestDir;
                }
            }
        }

        getDir(x, y) {
            if (!this.active || !this._isValid(x, y)) return 0;
            return this.vectorField[this._getIndex(x, y)];
        }
    }

    const _flowFields = new Map();

    window.UF.Pathfinding.requestFlowField = function(targetId, targetX, targetY) {
        if (!_flowFields.has(targetId)) {
            _flowFields.set(targetId, new FlowField($gameMap.width(), $gameMap.height()));
        }
        const field = _flowFields.get(targetId);
        // Only regenerate if target moved or field is not active
        if (!field.active || field.targetX !== targetX || field.targetY !== targetY) {
            field.generate(targetX, targetY);
        }
    };

    window.UF.Pathfinding.getFlowDir = function(targetId, currentX, currentY) {
        const field = _flowFields.get(targetId);
        if (field) {
            return field.getDir(currentX, currentY);
        }
        return 0;
    };

})();
