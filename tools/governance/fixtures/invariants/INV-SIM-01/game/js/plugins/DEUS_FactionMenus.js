class Window_NewGameSetup extends Window_Selectable {
    initialize(rect) {
        super.initialize(rect);
        this._factionIndex = 0;
        this._year = 1;
        this._seedInput = "";
    }
}
