# WG.FLUIDS.01: Cellular Automata Fluid Dynamics
Create game/js/plugins/DEUS_CellularFluids.js. Implement a low-priority engine tick that sweeps over a Uint8Array water depth grid. For every tile with water > 0, push water to adjacent tiles of lower elevation. Support simple pooling and dams (if an adjacent tile has a wall or door, it blocks water).
