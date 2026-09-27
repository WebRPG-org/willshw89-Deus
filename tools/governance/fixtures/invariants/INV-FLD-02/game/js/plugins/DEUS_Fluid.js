function reconcileCellWithStrata() {
    if (curDepth > cap) {
        let excess = curDepth - cap;
        gridZ[idx] = cap > 0 ? packVal(type, cap) : 0;
        excess = 0;
    }
}
