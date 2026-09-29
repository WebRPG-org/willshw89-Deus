//=============================================================================
// DEUS_Bag.js - Ultima VII-Style Graphical Bag & Drag-and-Drop Inventory
// Project DEUS
// Authority: WG.00.40, DEC-040, DEC-007
//=============================================================================

/*:
 * @target MZ
 * @plugindesc [DEUS Bag] Ultima VII-style graphical container bag with spatial item arrangement and world drag-and-drop.
 * @author DEUS
 * @base DEUS_Core
 * @base DEUS_World
 * @base DEUS_Items
 * @base DEUS_Containers
 * @orderAfter DEUS_Containers
 * @orderAfter DEUS_Sheet
 *
 * @help
 * Implements the Ultima VII-style graphical inventory bag:
 * - Freeform spatial arrangement of items inside the bag interior.
 * - Mouse drag-and-drop:
 *     A. World -> Bag: Drag/click accessible loose items into the open bag.
 *     B. Bag -> Bag: Reposition items freely inside the bag interior.
 *     C. Bag -> World: Drag items out of the bag onto valid world terrain.
 *     D. Bag <-> Container: Transfer items directly between bag and open chest.
 * - Carried weight / capacity tracking with real-time feedback.
 * - On-screen "BAG" button and non-conflicting hotkeys: 'B' or 'I'.
 */

(() => {
    "use strict";

    const root = typeof window !== "undefined" ? window : (typeof global !== "undefined" ? global : this);
    root.DEUS = root.DEUS || {};
    root.UF = root.UF || root.DEUS;

    const World = () => window.UF && UF.World;
    const Items = () => window.UF && UF.Items;
    const Containers = () => window.UF && UF.Containers;
    const ItemDrag = () => window.UF && (UF.ItemDrag || (UF.Containers && UF.Containers.DragDrop));

    // Register hotkeys 'B' and 'I' with Input
    if (typeof Input !== "undefined" && Input.keyMapper) {
        if (!Input.keyMapper[66]) Input.keyMapper[66] = "bag";       // 'B'
        if (!Input.keyMapper[73]) Input.keyMapper[73] = "inventory"; // 'I'
    }

    // Default bag interior dimensions
    const BAG_WIDTH = 340;
    const BAG_HEIGHT = 380;
    const ITEM_SIZE = 48;

    // Helper to resolve the active colonist/unit
    function getActiveUnit() {
        const W = World();
        if (!W) return null;
        const cm = window.$colonyManager;
        if (cm && cm.selectedColonist) {
            if (cm.selectedColonist.unit) return cm.selectedColonist.unit;
            if (cm.selectedColonist.id !== undefined) {
                const u = W.unit(cm.selectedColonist.id);
                if (u) return u;
            }
        }
        const S = window.UF && UF.Select;
        if (S && typeof S.selected === "function") {
            const sel = S.selected();
            if (sel && sel.length > 0) {
                const u = W.unit(sel[0]);
                if (u) return u;
            }
        }
        const cols = (W.state && W.state.colony && Array.isArray(W.state.colony.colonists)) ? W.state.colony.colonists : [];
        if (cols.length > 0) {
            const u = W.unit(cols[0]);
            if (u) return u;
        }
        const units = W.units ? W.units() : [];
        return units.length > 0 ? units[0] : null;
    }

    //-------------------------------------------------------------------------
    // Window_UFBag: The Graphical Bag Container
    //-------------------------------------------------------------------------
    class Window_UFBag extends Window_Base {
        initialize(rect) {
            super.initialize(rect || new Rectangle(16, 70, BAG_WIDTH, BAG_HEIGHT));
            this.backOpacity = 245;
            this._unitId = null;
            this._hoveredItem = null;
            this._itemSprites = [];
            this._draggingItem = null;
            this._bagItems = [];
            this.hide();
        }

        isOpen() {
            return this.visible;
        }

        isPointerInsideCoords(gx, gy) {
            return this.visible && gx >= this.x && gx < this.x + this.width && gy >= this.y && gy < this.y + this.height;
        }

        getInteriorRect() {
            const pad = this.padding;
            return new Rectangle(pad + 10, pad + 44, this.width - pad * 2 - 20, this.height - pad * 2 - 90);
        }

        openFor(unitId) {
            const u = unitId ? (World() ? World().unit(unitId) : null) : getActiveUnit();
            if (!u) return;
            this._unitId = u.id;
            this.show();
            this.activate();
            this.refresh();
            SoundManager.playOk();
        }

        close() {
            if (this.visible) {
                SoundManager.playCancel();
            }
            this.hide();
            this.deactivate();
            const drag = ItemDrag();
            if (drag && drag.hasAttached() && drag.source() && drag.source().kind === "bag") {
                drag.cancel();
            }
        }

        toggle(unitId) {
            if (this.visible) {
                this.close();
            } else {
                this.openFor(unitId);
            }
        }

        calculateCarriedWeight(unit) {
            const I = Items();
            if (!I || !unit) return { current: 0, max: 150 };
            const inv = I.inventoryOf(unit.id) || [];
            let current = 0;
            for (const it of inv) {
                const t = I.type(it.type);
                const w = (t && typeof t.weight === "number") ? t.weight : 1.0;
                current += w * (it.count || 1);
            }
            // Max carry capacity from D&D 5e: Strength score * 15 lbs
            const str = (unit.data && unit.data.dnd && unit.data.dnd.abilities && unit.data.dnd.abilities.STR) ? unit.data.dnd.abilities.STR : 10;
            const max = str * 15;
            return { current: Math.round(current * 10) / 10, max };
        }

        refresh() {
            this.contents.clear();
            const W = World();
            const I = Items();
            const u = this._unitId && W ? W.unit(this._unitId) : getActiveUnit();
            if (!u || !I) return;

            const interior = this.getInteriorRect();

            // 1. Draw Leather / Suede Bag Interior Background
            this.contents.fillRect(interior.x, interior.y, interior.width, interior.height, "#22160e");
            this.contents.strokeRect(interior.x, interior.y, interior.width, interior.height, "#4a3221");
            this.contents.fillRect(interior.x + 2, interior.y + 2, interior.width - 4, interior.height - 4, "#2e1e13");

            // Subtle stitched seam lines
            this.contents.strokeRect(interior.x + 6, interior.y + 6, interior.width - 12, interior.height - 12, "#3d2719");

            // 2. Draw Bag Header
            this.contents.fontSize = 15;
            this.changeTextColor("#f5d78e");
            const title = `${u.name || "Colonist"}'s Bag`;
            this.drawText(title, 14, 8, this.width - 50, "left");

            // Close button [X]
            this.changeTextColor("#ff8888");
            this.drawText("[X]", this.width - 46, 8, 30, "right");

            // 3. Carried Weight & Capacity Bar
            const wt = this.calculateCarriedWeight(u);
            const ratio = Math.min(1.0, wt.current / (wt.max || 1));
            const barW = interior.width;
            const barY = this.height - this.padding - 36;
            
            // Bar background
            this.contents.fillRect(interior.x, barY, barW, 14, "#15100c");
            // Fill
            const fillColor = ratio >= 1.0 ? "#e74c3c" : ratio > 0.8 ? "#f39c12" : "#27ae60";
            this.contents.fillRect(interior.x + 1, barY + 1, Math.round((barW - 2) * ratio), 12, fillColor);
            this.contents.strokeRect(interior.x, barY, barW, 14, "#4a3221");

            // Text
            this.contents.fontSize = 12;
            this.changeTextColor("#e0d0b8");
            this.drawText(`Weight: ${wt.current} / ${wt.max} lbs (${Math.round(ratio * 100)}%)`, interior.x, barY - 16, barW, "center");

            // 4. Retrieve Inventory Items & Ensure Layout
            const inv = I.inventoryOf(u.id) || [];
            this._bagItems = [];
            
            // Assign default staggered layout if not yet set
            const cols = 5;
            for (let i = 0; i < inv.length; i++) {
                const it = inv[i];
                if (typeof it.bagX !== "number" || typeof it.bagY !== "number") {
                    const col = i % cols;
                    const row = Math.floor(i / cols);
                    it.bagX = interior.x + 12 + col * (ITEM_SIZE + 6);
                    it.bagY = interior.y + 12 + row * (ITEM_SIZE + 6);
                }
                // Clamp within bag interior
                it.bagX = Math.max(interior.x + 4, Math.min(interior.x + interior.width - ITEM_SIZE - 4, it.bagX));
                it.bagY = Math.max(interior.y + 4, Math.min(interior.y + interior.height - ITEM_SIZE - 4, it.bagY));

                this._bagItems.push(it);
            }

            // 5. Draw Items Inside the Bag
            for (const it of this._bagItems) {
                this.drawBagItem(it);
            }

            // 6. Draw Hovered Tooltip / Status Line
            if (this._hoveredItem) {
                const t = I.type(this._hoveredItem.type);
                const name = t ? t.name : this._hoveredItem.type;
                const unitWeight = (t && typeof t.weight === "number") ? t.weight : 1.0;
                const totalWeight = Math.round(unitWeight * (this._hoveredItem.count || 1) * 10) / 10;
                const desc = `${name} (x${this._hoveredItem.count || 1}, ${totalWeight} lbs)`;
                this.contents.fontSize = 12;
                this.changeTextColor("#f5f0a0");
                this.drawText(desc, interior.x, interior.y + interior.height - 20, interior.width, "left");
            }
        }

        drawBagItem(item) {
            const I = Items();
            if (!I || !item) return;
            const t = I.type(item.type);
            const ix = item.bagX;
            const iy = item.bagY;

            // Highlight if hovered
            const isHovered = this._hoveredItem && this._hoveredItem.id === item.id;
            if (isHovered) {
                this.contents.fillRect(ix - 2, iy - 2, ITEM_SIZE + 4, ITEM_SIZE + 4, "rgba(241, 196, 15, 0.25)");
                this.contents.strokeRect(ix - 2, iy - 2, ITEM_SIZE + 4, ITEM_SIZE + 4, "#f1c40f");
            }

            // Load and draw character sprite
            if (t && t.image) {
                const bitmap = ImageManager.loadCharacter(t.image);
                if (bitmap && bitmap.isReady()) {
                    // Frame calculation: column 1 (center), row 0
                    const fw = Math.floor(bitmap.width / 3);
                    const fh = Math.floor(bitmap.height / 4);
                    // Draw source frame into ITEM_SIZE x ITEM_SIZE, preserving aspect ratio
                    const scale = Math.min(ITEM_SIZE / fw, ITEM_SIZE / fh);
                    const dw = Math.round(fw * scale);
                    const dh = Math.round(fh * scale);
                    const dx = ix + Math.round((ITEM_SIZE - dw) / 2);
                    const dy = iy + (ITEM_SIZE - dh);
                    this.contents.blt(bitmap, fw, 0, fw, fh, dx, dy, dw, dh);
                } else {
                    // Placeholder box while bitmap loads
                    this.contents.fillRect(ix + 4, iy + 4, ITEM_SIZE - 8, ITEM_SIZE - 8, "#3e4a3d");
                    if (bitmap) bitmap.addLoadListener(() => this.refresh());
                }
            }

            // Stack count badge if count > 1
            if (item.count > 1) {
                this.contents.fontSize = 11;
                this.changeTextColor("#ffffff");
                this.drawText(`x${item.count}`, ix + ITEM_SIZE - 28, iy + ITEM_SIZE - 16, 26, "right");
            }
        }

        itemAtCoords(gx, gy) {
            const lx = gx - this.x;
            const ly = gy - this.y;
            for (let i = this._bagItems.length - 1; i >= 0; i--) {
                const it = this._bagItems[i];
                if (lx >= it.bagX && lx <= it.bagX + ITEM_SIZE &&
                    ly >= it.bagY && ly <= it.bagY + ITEM_SIZE) {
                    return it;
                }
            }
            return null;
        }

        update() {
            super.update();
            if (!this.visible) return;

            const drag = ItemDrag();

            // Hover detection
            const prevHovered = this._hoveredItem;
            if (this.isPointerInsideCoords(TouchInput.x, TouchInput.y) && (!drag || !drag.hasAttached())) {
                this._hoveredItem = this.itemAtCoords(TouchInput.x, TouchInput.y);
            } else {
                this._hoveredItem = null;
            }
            if (prevHovered !== this._hoveredItem) {
                this.refresh();
            }

            // Close button click
            if (TouchInput.isTriggered()) {
                const lx = TouchInput.x - this.x;
                const ly = TouchInput.y - this.y;
                if (lx >= this.width - 50 && lx <= this.width - 10 && ly >= 4 && ly <= 28) {
                    this.close();
                    return;
                }
            }

            // Mouse pickup from inside the bag
            if (TouchInput.isTriggered() && this.isPointerInsideCoords(TouchInput.x, TouchInput.y)) {
                if (!drag || !drag.hasAttached()) {
                    const it = this.itemAtCoords(TouchInput.x, TouchInput.y);
                    if (it && drag) {
                        TouchInput._currentState.triggered = false;
                        drag.attach({
                            kind: "bag",
                            unitId: this._unitId,
                            item: it,
                            itemId: it.id,
                            origBagX: it.bagX,
                            origBagY: it.bagY
                        }, SceneManager._scene);
                        this.refresh();
                        return;
                    }
                }
            }
        }

        handleDrop(source, dropX, dropY) {
            const I = Items();
            const W = World();
            const u = this._unitId && W ? W.unit(this._unitId) : getActiveUnit();
            if (!I || !u) return false;

            const interior = this.getInteriorRect();
            const lx = Math.max(interior.x + 4, Math.min(interior.x + interior.width - ITEM_SIZE - 4, dropX - this.x - Math.floor(ITEM_SIZE / 2)));
            const ly = Math.max(interior.y + 4, Math.min(interior.y + interior.height - ITEM_SIZE - 4, dropY - this.y - Math.floor(ITEM_SIZE / 2)));

            // Case A: Bag -> Bag (Reposition inside the bag)
            if (source.kind === "bag") {
                source.item.bagX = lx;
                source.item.bagY = ly;
                SoundManager.playCursor();
                this.refresh();
                return true;
            }

            // Case B: World -> Bag (Pick up loose object from world)
            if (source.kind === "world") {
                const picked = I.pickUp(source.itemId, u.id);
                if (picked) {
                    const it = I.get(source.itemId);
                    if (it) {
                        it.bagX = lx;
                        it.bagY = ly;
                    }
                    SoundManager.playOk();
                    this.refresh();
                    return true;
                } else {
                    SoundManager.playBuzzer();
                    return false;
                }
            }

            // Case C: Container -> Bag (Transfer from Chest to Bag)
            if (source.kind === "container") {
                const C = Containers();
                if (C) {
                    const transferred = C.takeItem(source.containerId, source.item.id, u.id);
                    if (transferred) {
                        source.item.bagX = lx;
                        source.item.bagY = ly;
                        SoundManager.playOk();
                        this.refresh();
                        const scene = SceneManager._scene;
                        if (scene && scene._ufContainerCard && scene._ufContainerCard.visible) {
                            scene._ufContainerCard.refresh();
                        }
                        return true;
                    }
                }
                SoundManager.playBuzzer();
                return false;
            }

            // Case D: General Inventory -> Bag
            if (source.kind === "inventory") {
                source.item.bagX = lx;
                source.item.bagY = ly;
                SoundManager.playOk();
                this.refresh();
                return true;
            }

            return false;
        }
    }

    //-------------------------------------------------------------------------
    // Sprite_UFBagButton: The On-Screen Bag Button
    //-------------------------------------------------------------------------
    class Sprite_UFBagButton extends Sprite {
        initialize() {
            super.initialize();
            this.bitmap = new Bitmap(76, 32);
            this.x = 16;
            this.y = 80;
            this.draw();
            this.visible = true;
        }

        draw() {
            const b = this.bitmap;
            b.clear();
            // Leather button styling
            b.fillRect(0, 0, 76, 32, "#3d2719");
            b.fillRect(2, 2, 72, 28, "#5c3a21");
            b.strokeRect(0, 0, 76, 32, "#7a4e2c");
            b.strokeRect(2, 2, 72, 28, "#2e1a0e");
            b.fontSize = 14;
            b.textColor = "#f5d78e";
            b.drawText("BAG [B]", 0, 0, 76, 32, "center");
        }

        update() {
            super.update();
            if (TouchInput.isTriggered()) {
                const mx = TouchInput.x;
                const my = TouchInput.y;
                if (mx >= this.x && mx <= this.x + 76 && my >= this.y && my <= this.y + 32) {
                    const scene = SceneManager._scene;
                    if (scene && scene._ufBagWindow) {
                        TouchInput._currentState.triggered = false;
                        scene._ufBagWindow.toggle();
                    }
                }
            }
        }
    }

    //-------------------------------------------------------------------------
    // Scene_Map Hooks
    //-------------------------------------------------------------------------
    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);

        this._ufBagWindow = new Window_UFBag();
        this.addChild(this._ufBagWindow);

        this._ufBagButton = new Sprite_UFBagButton();
        this.addChild(this._ufBagButton);
    };

    const _Scene_Map_update = Scene_Map.prototype.update;
    Scene_Map.prototype.update = function() {
        _Scene_Map_update.call(this);

        // Keyboard shortcuts: 'B' or 'I' toggles Bag
        if (typeof Input !== "undefined" && Input.isTriggered) {
            if (Input.isTriggered("bag") || Input.isTriggered("inventory")) {
                if (this._ufBagWindow) this._ufBagWindow.toggle();
            } else if (Input.isTriggered("escape")) {
                if (this._ufBagWindow && this._ufBagWindow.visible) {
                    this._ufBagWindow.close();
                }
            }
        }

        // Hook ItemDrag into Bag Window Drops
        const drag = ItemDrag();
        if (drag && drag.hasAttached() && (TouchInput.isTriggered() || !TouchInput.isPressed())) {
            const dropX = TouchInput.x;
            const dropY = TouchInput.y;

            if (this._ufBagWindow && this._ufBagWindow.isPointerInsideCoords(dropX, dropY)) {
                const src = drag.source();
                if (src) {
                    const handled = this._ufBagWindow.handleDrop(src, dropX, dropY);
                    if (handled) {
                        drag.cancel();
                        TouchInput._currentState.triggered = false;
                        return;
                    }
                }
            }
        }
    };

    // Hook World Map Item Pickup: Clicking loose items in world attaches to drag
    const _Scene_Map_processMapTouch = Scene_Map.prototype.processMapTouch;
    Scene_Map.prototype.processMapTouch = function() {
        if (TouchInput.isTriggered()) {
            const drag = ItemDrag();
            const bagWin = this._ufBagWindow;

            // If mouse has item attached, don't trigger normal map touch
            if (drag && drag.hasAttached()) {
                return;
            }

            // If clicking on the map while not over any window
            const overBag = bagWin && bagWin.isPointerInsideCoords(TouchInput.x, TouchInput.y);
            const overCard = this._ufContainerCard && this._ufContainerCard.isPointerInsideCoords(TouchInput.x, TouchInput.y);
            const overSheet = window.UF && UF.Sheet && UF.Sheet.window && UF.Sheet.window().isPointerInsideCoords(TouchInput.x, TouchInput.y);

            if (!overBag && !overCard && !overSheet) {
                const I = Items();
                const W = World();
                if (I && W && typeof $gameMap !== "undefined") {
                    const mx = $gameMap.canvasToMapX(TouchInput.x);
                    const my = $gameMap.canvasToMapY(TouchInput.y);
                    const curArea = W.currentArea ? W.currentArea() : null;
                    const curZ = W.currentLevel ? W.currentLevel() : 0;

                    const itemsHere = typeof I.at === "function" ? I.at(curArea, mx, my, curZ) : [];
                    if (itemsHere && itemsHere.length > 0) {
                        const topItem = itemsHere[itemsHere.length - 1];
                        if (drag) {
                            TouchInput._currentState.triggered = false;
                            drag.attach({
                                kind: "world",
                                item: topItem,
                                itemId: topItem.id,
                                mx, my, area: curArea, z: curZ
                            }, this);
                            SoundManager.playCursor();
                            return;
                        }
                    }
                }
            }
        }
        _Scene_Map_processMapTouch.call(this);
    };

    // Export API
    root.Window_UFBag = Window_UFBag;
    root.Sprite_UFBagButton = Sprite_UFBagButton;
    UF.Window_UFBag = Window_UFBag;
    UF.Sprite_UFBagButton = Sprite_UFBagButton;

    UF.Bag = {
        window: () => SceneManager._scene && SceneManager._scene._ufBagWindow,
        open: (unitId) => {
            const w = SceneManager._scene && SceneManager._scene._ufBagWindow;
            if (w) w.openFor(unitId);
        },
        close: () => {
            const w = SceneManager._scene && SceneManager._scene._ufBagWindow;
            if (w) w.close();
        },
        toggle: (unitId) => {
            const w = SceneManager._scene && SceneManager._scene._ufBagWindow;
            if (w) w.toggle(unitId);
        }
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { Window_UFBag, Sprite_UFBagButton };
    }
})();
