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
 * - Freeform spatial arrangement of items inside the organic sack interior.
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
    const UF = root.UF;

    const World = () => (root.UF && root.UF.World) || (typeof window !== "undefined" && window.UF && window.UF.World);
    const Items = () => (root.UF && root.UF.Items) || (typeof window !== "undefined" && window.UF && window.UF.Items);
    const Containers = () => (root.UF && root.UF.Containers) || (typeof window !== "undefined" && window.UF && window.UF.Containers);
    const ItemDrag = () => (root.UF && (root.UF.ItemDrag || (root.UF.Containers && root.UF.Containers.DragDrop)));

    // Register hotkeys 'B' and 'I' with Input
    if (typeof Input !== "undefined" && Input.keyMapper) {
        if (!Input.keyMapper[66]) Input.keyMapper[66] = "bag";       // 'B'
        if (!Input.keyMapper[73]) Input.keyMapper[73] = "inventory"; // 'I'
    }

    const SafeWindow_Base = typeof Window_Base !== "undefined" ? Window_Base : (root.Window_Base || class {});
    const SafeSprite = typeof Sprite !== "undefined" ? Sprite : (root.Sprite || class {});
    const SafeRectangle = typeof Rectangle !== "undefined" ? Rectangle : (root.Rectangle || class {
        constructor(x, y, w, h) { this.x = x || 0; this.y = y || 0; this.width = w || 0; this.height = h || 0; }
    });

    // Default dimensions matching native 200x200 16-bit open sack artwork
    const BAG_WIDTH = 200;
    const BAG_HEIGHT = 200;
    const ITEM_SIZE = 28;

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
    // Window_UFBag: The Illustrated Open Sack Interface
    //-------------------------------------------------------------------------
    class Window_UFBag extends SafeWindow_Base {
        constructor(rect) {
            const r = rect || new SafeRectangle(16, 70, BAG_WIDTH, BAG_HEIGHT);
            super(r);
            if (!this._bagInitialized) {
                this.initialize(r);
            }
        }

        initialize(rect) {
            const r = rect || new SafeRectangle(16, 70, BAG_WIDTH, BAG_HEIGHT);
            if (typeof super.initialize === "function") {
                super.initialize(r);
            }
            this.x = r.x;
            this.y = r.y;
            this.width = r.width;
            this.height = r.height;
            this.opacity = 0;
            this.padding = 0;
            if (this._windowFrameSprite) this._windowFrameSprite.visible = false;
            if (this._windowBackSprite) this._windowBackSprite.visible = false;
            this._unitId = null;
            this._hoveredItem = null;
            this._bagItems = [];
            this._isDraggingSack = false;
            this._sackGrabX = 0;
            this._sackGrabY = 0;
            this._closeHovered = false;
            this._bagInitialized = true;
            this.hide();
        }

        isOpen() {
            return this.visible;
        }

        isPointerInsideCoords(gx, gy) {
            return this.visible && gx >= this.x && gx < this.x + this.width && gy >= this.y && gy < this.y + this.height;
        }

        getInteriorRect() {
            if (this.width <= 220) {
                return new SafeRectangle(35, 48, 128, 92);
            }
            const sx = this.width / 200;
            const sy = this.height / 200;
            return new SafeRectangle(Math.round(35 * sx), Math.round(48 * sy), Math.round(128 * sx), Math.round(92 * sy));
        }

        clampToCavity(x, y, itemW, itemH, interior) {
            const minX = interior.x + 2;
            const maxX = interior.x + interior.width - itemW - 2;
            const minY = interior.y + 2;
            const maxY = interior.y + interior.height - itemH - 2;
            return {
                x: Math.max(minX, Math.min(maxX, x)),
                y: Math.max(minY, Math.min(maxY, y))
            };
        }

        openFor(unitId) {
            let u = null;
            if (unitId !== undefined && unitId !== null) {
                const W = World();
                u = (W && typeof W.unit === "function" ? W.unit(unitId) : null) || { id: unitId };
            } else {
                u = getActiveUnit();
            }
            if (!u) return;
            this._unitId = u.id;
            this.show();
            this.activate();
            this.refresh();
            if (typeof SoundManager !== "undefined") SoundManager.playOk();
        }

        close() {
            if (this.visible) {
                if (typeof SoundManager !== "undefined") SoundManager.playCancel();
            }
            this.hide();
            this.deactivate();
            this._isDraggingSack = false;
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
            const uid = unit.id !== undefined ? unit.id : unit;
            const inv = I.inventoryOf(uid) || [];
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
            if (!this.contents) return;
            this.contents.clear();
            const W = World();
            const I = Items();
            const u = (this._unitId !== null && this._unitId !== undefined && W && typeof W.unit === "function" ? (W.unit(this._unitId) || { id: this._unitId }) : null) || getActiveUnit();
            if (!u || !I) return;

            // 1. Draw Authentic Open Sack Background Graphic
            if (typeof ImageManager !== "undefined") {
                const sackBmp = ImageManager.loadSystem("ui_open_sack");
                if (sackBmp && sackBmp.isReady()) {
                    this.contents.blt(sackBmp, 0, 0, sackBmp.width, sackBmp.height, 0, 0, this.width, this.height);
                } else if (sackBmp) {
                    sackBmp.addLoadListener(() => this.refresh());
                }
            }

            const interior = this.getInteriorRect();

            // 2. Draw Subtle Title Header (top rim)
            this.contents.fontSize = 11;
            this.changeTextColor("#f5d78e");
            const title = `${u.name || "Colonist"}'s Sack`;
            this.drawText(title, 10, 4, this.width - 40, "left");

            // Close button [✕] at top right rim
            this.changeTextColor(this._closeHovered ? "#ff6b6b" : "#e0d0b8");
            this.contents.fontSize = 12;
            this.drawText("✕", this.width - 24, 4, 18, "center");

            // 3. Draw Loose Items inside the dark cavity
            const inv = I.inventoryOf(u.id) || [];
            this._bagItems = [];

            // Assign organic loose scatter position for any item without recorded bagX/bagY
            for (let i = 0; i < inv.length; i++) {
                const it = inv[i];
                if (typeof it.bagX !== "number" || typeof it.bagY !== "number") {
                    // Deterministic loose scatter using item ID hash
                    let hash = 0;
                    const sid = String(it.id || i);
                    for (let c = 0; c < sid.length; c++) hash = (hash * 31 + sid.charCodeAt(c)) >>> 0;
                    hash += i * 101;
                    const angle = (hash % 628) / 100;
                    const radDist = 0.15 + ((hash >> 8) % 55) / 100;
                    const cx = interior.x + interior.width / 2;
                    const cy = interior.y + interior.height / 2;
                    const rx = (interior.width / 2) - 16;
                    const ry = (interior.height / 2) - 14;
                    it.bagX = Math.round(cx + Math.cos(angle) * (rx * radDist) - ITEM_SIZE / 2);
                    it.bagY = Math.round(cy + Math.sin(angle) * (ry * radDist) - ITEM_SIZE / 2);
                }

                // Ensure item stays clamped inside the cavity
                const clamped = this.clampToCavity(it.bagX, it.bagY, ITEM_SIZE, ITEM_SIZE, interior);
                it.bagX = clamped.x;
                it.bagY = clamped.y;

                this._bagItems.push(it);
            }

            // Draw each loose item in layer order (natural overlap)
            for (const it of this._bagItems) {
                this.drawBagItem(it);
            }

            // 4. Carried Weight / Capacity readout (bottom rim)
            const wt = this.calculateCarriedWeight(u);
            const isOver = wt.current > wt.max;
            this.contents.fontSize = 10;
            this.changeTextColor(isOver ? "#ef4444" : "#e0d0b8");
            this.drawText(`${wt.current} / ${wt.max} lbs`, 0, this.height - 18, this.width, "center");

            // 5. Tooltip on hovered item
            if (this._hoveredItem) {
                const t = I.type(this._hoveredItem.type);
                const name = t ? t.name : this._hoveredItem.type;
                const unitWeight = (t && typeof t.weight === "number") ? t.weight : 1.0;
                const totalWeight = Math.round(unitWeight * (this._hoveredItem.count || 1) * 10) / 10;
                const desc = `${name} (${totalWeight} lbs)`;
                this.contents.fontSize = 11;
                this.changeTextColor("#fef08a");
                this.drawText(desc, 6, this.height - 30, this.width - 12, "center");
            }
        }

        drawBagItem(item) {
            const I = Items();
            if (!I || !item) return;
            const t = I.type(item.type);
            const ix = item.bagX;
            const iy = item.bagY;

            // Highlight outline if hovered
            const isHovered = this._hoveredItem && this._hoveredItem.id === item.id;
            if (isHovered) {
                this.contents.strokeRect(ix - 1, iy - 1, ITEM_SIZE + 2, ITEM_SIZE + 2, "#f1c40f");
            }

            // Load and draw character sprite / item icon
            if (window.UF && UF.Sheet && typeof UF.Sheet.drawItemIn === "function") {
                UF.Sheet.drawItemIn(this.contents, { x: ix, y: iy, w: ITEM_SIZE, h: ITEM_SIZE }, item.type, item.count);
            } else if (t && t.image && typeof ImageManager !== "undefined") {
                const bitmap = ImageManager.loadCharacter(t.image);
                if (bitmap && bitmap.isReady()) {
                    const fw = Math.floor(bitmap.width / 3);
                    const fh = Math.floor(bitmap.height / 4);
                    const scale = Math.min(ITEM_SIZE / fw, ITEM_SIZE / fh);
                    const dw = Math.round(fw * scale);
                    const dh = Math.round(fh * scale);
                    const dx = ix + Math.round((ITEM_SIZE - dw) / 2);
                    const dy = iy + (ITEM_SIZE - dh);
                    this.contents.blt(bitmap, fw, 0, fw, fh, dx, dy, dw, dh);
                } else if (bitmap) {
                    bitmap.addLoadListener(() => this.refresh());
                }
            }

            // Stack count badge if count > 1
            if (item.count > 1) {
                this.contents.fontSize = 10;
                this.changeTextColor("#ffffff");
                this.drawText(`x${item.count}`, ix + ITEM_SIZE - 22, iy + ITEM_SIZE - 12, 20, "right");
            }
        }

        itemAtCoords(gx, gy) {
            const lx = gx - this.x;
            const ly = gy - this.y;
            // Iterate in reverse (topmost item first)
            for (let i = this._bagItems.length - 1; i >= 0; i--) {
                const it = this._bagItems[i];
                if (lx >= it.bagX && lx <= it.bagX + ITEM_SIZE &&
                    ly >= it.bagY && ly <= it.bagY + ITEM_SIZE) {
                    return { item: it, index: i };
                }
            }
            return null;
        }

        update() {
            super.update();
            if (!this.visible || typeof TouchInput === "undefined") return;

            const drag = ItemDrag();

            // Dragging the sack window itself by outer rim
            if (this._isDraggingSack) {
                if (TouchInput.isPressed()) {
                    const maxW = (typeof Graphics !== "undefined" ? Graphics.boxWidth : 816) - this.width;
                    const maxH = (typeof Graphics !== "undefined" ? Graphics.boxHeight : 624) - this.height;
                    this.x = Math.max(0, Math.min(maxW, TouchInput.x - this._sackGrabX));
                    this.y = Math.max(0, Math.min(maxH, TouchInput.y - this._sackGrabY));
                    return;
                } else {
                    this._isDraggingSack = false;
                }
            }

            const lx = TouchInput.x - this.x;
            const ly = TouchInput.y - this.y;
            const overSack = this.isPointerInsideCoords(TouchInput.x, TouchInput.y);

            // Hover detection
            const prevCloseHovered = this._closeHovered;
            this._closeHovered = overSack && lx >= this.width - 26 && lx <= this.width - 6 && ly >= 2 && ly <= 22;

            const prevHovered = this._hoveredItem;
            if (overSack && (!drag || !drag.hasAttached()) && !this._closeHovered) {
                const hit = this.itemAtCoords(TouchInput.x, TouchInput.y);
                this._hoveredItem = hit ? hit.item : null;
            } else {
                this._hoveredItem = null;
            }
            if (prevHovered !== this._hoveredItem || prevCloseHovered !== this._closeHovered) {
                this.refresh();
            }

            // Click handling
            if (TouchInput.isTriggered() && overSack) {
                // 1. Close button click
                if (this._closeHovered) {
                    TouchInput._currentState.triggered = false;
                    this.close();
                    return;
                }

                // 2. Click on item -> pick up and attach to drag
                if (!drag || !drag.hasAttached()) {
                    const hit = this.itemAtCoords(TouchInput.x, TouchInput.y);
                    if (hit && drag) {
                        TouchInput._currentState.triggered = false;
                        const it = hit.item;
                        const grabOffsetX = lx - it.bagX;
                        const grabOffsetY = ly - it.bagY;

                        // Bring item forward in draw order
                        this._bagItems.splice(hit.index, 1);
                        this._bagItems.push(it);

                        drag.attach({
                            kind: "bag",
                            unitId: this._unitId,
                            item: it,
                            itemId: it.id,
                            grabOffsetX: grabOffsetX,
                            grabOffsetY: grabOffsetY,
                            origBagX: it.bagX,
                            origBagY: it.bagY
                        }, SceneManager._scene);
                        this.refresh();
                        return;
                    }
                }

                // 3. Clicked on outer leather rim -> start dragging sack window
                if (!drag || !drag.hasAttached()) {
                    this._isDraggingSack = true;
                    this._sackGrabX = TouchInput.x - this.x;
                    this._sackGrabY = TouchInput.y - this.y;
                    TouchInput._currentState.triggered = false;
                    return;
                }
            }
        }

        handleDrop(source, dropX, dropY) {
            const I = Items();
            const W = World();
            const u = (this._unitId !== null && this._unitId !== undefined && W && typeof W.unit === "function" ? (W.unit(this._unitId) || { id: this._unitId }) : null) || getActiveUnit();
            if (!I || !u) return false;

            const interior = this.getInteriorRect();
            const grabX = (source && typeof source.grabOffsetX === "number") ? source.grabOffsetX : 24;
            const grabY = (source && typeof source.grabOffsetY === "number") ? source.grabOffsetY : 24;

            let targetX = dropX - this.x - grabX;
            let targetY = dropY - this.y - grabY;

            // Clamp into cavity
            const clamped = this.clampToCavity(targetX, targetY, ITEM_SIZE, ITEM_SIZE, interior);
            targetX = clamped.x;
            targetY = clamped.y;

            // Case A: Bag -> Bag (Reposition inside the bag)
            if (source.kind === "bag") {
                source.item.bagX = targetX;
                source.item.bagY = targetY;
                if (typeof SoundManager !== "undefined") SoundManager.playCursor();
                this.refresh();
                return true;
            }

            // Case B: World -> Bag (Pick up loose object from world)
            if (source.kind === "world") {
                const picked = I.pickUp(source.itemId, u.id);
                if (picked) {
                    const it = I.get ? I.get(source.itemId) : source.item;
                    if (it) {
                        it.bagX = targetX;
                        it.bagY = targetY;
                    }
                    if (typeof SoundManager !== "undefined") SoundManager.playOk();
                    this.refresh();
                    return true;
                } else {
                    if (typeof SoundManager !== "undefined") SoundManager.playBuzzer();
                    return false;
                }
            }

            // Case C: Container -> Bag (Transfer from Chest to Bag)
            if (source.kind === "container") {
                const C = Containers();
                if (C) {
                    const transferred = C.takeItem(source.containerId, source.item.id, u.id);
                    if (transferred) {
                        source.item.bagX = targetX;
                        source.item.bagY = targetY;
                        if (typeof SoundManager !== "undefined") SoundManager.playOk();
                        this.refresh();
                        const scene = SceneManager._scene;
                        if (scene && scene._ufContainerCard && scene._ufContainerCard.visible) {
                            scene._ufContainerCard.refresh();
                        }
                        return true;
                    }
                }
                if (typeof SoundManager !== "undefined") SoundManager.playBuzzer();
                return false;
            }

            // Case D: General Inventory -> Bag
            if (source.kind === "inventory") {
                source.item.bagX = targetX;
                source.item.bagY = targetY;
                if (typeof SoundManager !== "undefined") SoundManager.playOk();
                this.refresh();
                return true;
            }

            return false;
        }
    }

    //-------------------------------------------------------------------------
    // Sprite_UFBagButton: The On-Screen Bag Button
    //-------------------------------------------------------------------------
    class Sprite_UFBagButton extends SafeSprite {
        initialize() {
            super.initialize();
            this.bitmap = new Bitmap(76, 28);
            this.x = 16;
            this.y = 80;
            this.draw();
            this.visible = true;
        }

        draw() {
            const b = this.bitmap;
            b.clear();
            // Leather button styling
            b.fillRect(0, 0, 76, 28, "#3d2719");
            b.fillRect(2, 2, 72, 24, "#5c3a21");
            b.strokeRect(0, 0, 76, 28, "#7a4e2c");
            b.strokeRect(2, 2, 72, 24, "#2e1a0e");
            b.fontSize = 13;
            b.textColor = "#f5d78e";
            b.drawText("BAG [B]", 0, 0, 76, 28, "center");
        }

        update() {
            super.update();
            if (typeof TouchInput !== "undefined" && TouchInput.isTriggered()) {
                const mx = TouchInput.x;
                const my = TouchInput.y;
                if (mx >= this.x && mx <= this.x + 76 && my >= this.y && my <= this.y + 28) {
                    TouchInput._currentState.triggered = false;
                    UF.Bag.toggle();
                }
            }
        }
    }

    //-------------------------------------------------------------------------
    // Scene_Map Hooks
    //-------------------------------------------------------------------------
    if (typeof Scene_Map !== "undefined" && Scene_Map.prototype) {
        const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
        Scene_Map.prototype.createAllWindows = function() {
            _Scene_Map_createAllWindows.call(this);

            this._ufBagWindow = new Window_UFBag();
            this._ufBagWindow.visible = false;
            this.addChild(this._ufBagWindow);

            this._ufBagButton = new Sprite_UFBagButton();
            this.addChild(this._ufBagButton);
        };

        const _Scene_Map_update = Scene_Map.prototype.update;
        Scene_Map.prototype.update = function() {
            _Scene_Map_update.call(this);

            // Keyboard shortcuts: 'B' or 'I' toggles Creature Inventory (Tab 1 with black rectangle bag)
            if (typeof Input !== "undefined" && Input.isTriggered) {
                if (Input.isTriggered("bag") || Input.isTriggered("inventory")) {
                    UF.Bag.toggle();
                } else if (Input.isTriggered("escape")) {
                    if (window.UF && UF.Sheet && UF.Sheet.window && UF.Sheet.window().visible) {
                        UF.Sheet.close();
                    }
                    if (this._ufBagWindow && this._ufBagWindow.visible) {
                        this._ufBagWindow.close();
                    }
                }
            }

            // Hook ItemDrag into Bag Window Drops or World Drops
            const drag = ItemDrag();
            if (drag && drag.hasAttached() && typeof TouchInput !== "undefined" && (TouchInput.isTriggered() || !TouchInput.isPressed())) {
                const dropX = TouchInput.x;
                const dropY = TouchInput.y;

                // 1. Drop into Bag Window
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

                // 2. Drop from Bag into World Map (outside any window)
                const overCard = this._ufContainerCard && this._ufContainerCard.isPointerInsideCoords(dropX, dropY);
                const overSheet = window.UF && UF.Sheet && UF.Sheet.window && UF.Sheet.window().isPointerInsideCoords(dropX, dropY);
                const overBag = this._ufBagWindow && this._ufBagWindow.isPointerInsideCoords(dropX, dropY);

                if (!overCard && !overSheet && !overBag) {
                    const src = drag.source();
                    if (src && src.kind === "bag") {
                        const I = Items();
                        const W = World();
                        const u = src.unitId && W ? W.unit(src.unitId) : getActiveUnit();
                        if (I && u && typeof $gameMap !== "undefined") {
                            const mx = $gameMap.canvasToMapX(dropX);
                            const my = $gameMap.canvasToMapY(dropY);
                            const curArea = W.currentArea ? W.currentArea() : u.area;
                            const curZ = W.currentLevel ? W.currentLevel() : 0;
                            I.putDown(src.item.id, curArea, mx, my, curZ);
                            drag.cancel();
                            TouchInput._currentState.triggered = false;
                            if (this._ufBagWindow) this._ufBagWindow.refresh();
                            if (typeof SoundManager !== "undefined") SoundManager.playOk();
                            return;
                        }
                    }
                }
            }
        };

        // Hook World Map Item Pickup: Clicking loose items in world attaches to drag
        const _Scene_Map_processMapTouch = Scene_Map.prototype.processMapTouch;
        Scene_Map.prototype.processMapTouch = function() {
            if (typeof TouchInput !== "undefined" && TouchInput.isTriggered()) {
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
                                    grabOffsetX: 16,
                                    grabOffsetY: 16,
                                    mx, my, area: curArea, z: curZ
                                }, this);
                                if (typeof SoundManager !== "undefined") SoundManager.playCursor();
                                return;
                            }
                        }
                    }
                }
            }
            _Scene_Map_processMapTouch.call(this);
        };
    }

    // Export API
    root.Window_UFBag = Window_UFBag;
    root.Sprite_UFBagButton = Sprite_UFBagButton;
    UF.Window_UFBag = Window_UFBag;
    UF.Sprite_UFBagButton = Sprite_UFBagButton;

    UF.Bag = {
        window: () => (window.UF && UF.Sheet && UF.Sheet.window ? UF.Sheet.window() : (SceneManager._scene && SceneManager._scene._ufBagWindow)),
        open: (unitId) => {
            const u = unitId ? (World() && World().unit(unitId)) : getActiveUnit();
            if (u && window.UF && UF.Sheet) {
                UF.Sheet.open(u.id);
                if (UF.Sheet.window()) UF.Sheet.window().switchTab(1);
            }
        },
        close: () => {
            if (window.UF && UF.Sheet && typeof UF.Sheet.close === "function") {
                UF.Sheet.close();
            }
            const w = SceneManager._scene && SceneManager._scene._ufBagWindow;
            if (w && w.visible) w.close();
        },
        toggle: (unitId) => {
            const sh = window.UF && UF.Sheet;
            if (!sh) return;
            const win = sh.window ? sh.window() : null;
            const curTab = win && typeof win.activeTab === "function" ? win.activeTab() : (win ? win._activeTab : 0);
            if (win && win.visible && curTab === 1) {
                sh.close();
            } else {
                const u = unitId ? (World() && World().unit(unitId)) : getActiveUnit();
                if (u) {
                    sh.open(u.id);
                    if (sh.window()) sh.window().switchTab(1);
                }
            }
        }
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { Window_UFBag, Sprite_UFBagButton };
    }
})();
