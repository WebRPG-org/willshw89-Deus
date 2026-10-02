# WG.00.47 Seeded Runtime Spawner (DEC-073 & DEC-080)

## Deep Research Findings
- **No Dormant Culling:** Discard any logic for culling. Creatures do not breed; they only refill up to their deterministic cap.
- **Deterministic Anchors:** Derive all dens, lairs, and density caps purely from the world seed and starts (SPAWNER_DEC073.md line 221).
- **Sparse Depletion Tracking:** On combat:kill, record the timestamp for the specific (area, z). The current spawn rate is a closed-form calculation of (now - recorded_time).
- **Sparse Anchor Counts:** For remote areas (Tier D), store the current count and next respawn timer per anchor *only* if the anchor is not full. Fully populated anchors require no memory or save storage.
