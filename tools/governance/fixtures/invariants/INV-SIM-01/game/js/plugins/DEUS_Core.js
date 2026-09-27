class Game_UFTime {
    constructor() {
        const setupYear = window.UF && UF.NewGameSetup ? UF.NewGameSetup.year : undefined;
        this.year = Number.isInteger(setupYear) && setupYear >= 0 ? setupYear : 0;
    }
}
