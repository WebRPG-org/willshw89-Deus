# WorldGen Multithreading Review (DEC-092)

## 1. Sparse Memory vs SharedArrayBuffer (SAB)
**The Problem:** Traditional Minecraft multithreading uses monolithic 3D chunk memory buffers. If we blindly apply this to DEUS using a SharedArrayBuffer, we will destroy our memory footprint. DEUS uses sparse 2D layers (32x32 cells = 2KB per layer). If a layer is pure air or solid stone, it allocates zero arrays. 
**The Fix:** The background Web Workers must NOT allocate dense 3D SABs. They must evaluate sparsity during generation and pass the sparse layers back to the main thread via standard postMessage transferrable objects.

## 2. One-Way Handoff Optimization
**The Problem:** Using Atomics.store() and spin-locking memory between the Main Render Thread and the WorldGen Thread causes V8 engine stutter.
**The Fix:** Chunk generation in DEUS is a bulk, one-way handoff. The worker generates the sparse layer buffers and executes a postMessage({ type: 'CHUNK_READY' }, [buffers]) transfer. This hands memory ownership to the main thread instantly, avoiding locks and guaranteeing zero frame stutter.

## 3. NW.js Security Flags
**The Risk:** Modern Chrome engines (which power RPG Maker MZ and NW.js) block SharedArrayBuffer due to Spectre CPU mitigations unless strict Cross-Origin Isolation headers are met. 
**The Fix:** Since DEUS runs locally, we must append --enable-features=SharedArrayBuffer to chromium-args in game/package.json to ensure the multithreaded terrain generator doesn't silently crash on launch.
