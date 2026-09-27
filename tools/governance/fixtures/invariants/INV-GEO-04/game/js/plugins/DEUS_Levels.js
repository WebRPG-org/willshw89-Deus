        //---------------------------------------------------------------- no floating natural mass
        {
            for (let i = 0; i < n; i++) push(i);
            for (let e = 0; e < E_TOP; e++) for (let k = 0; k < size; k++) {
                push(e * n + k); push(e * n + (size - 1) * size + k); push(e * n + k * size); push(e * n + k * size + size - 1);
            }
            for (let v = 0; v < N; v++) {
                if (sol[v] !== 1) continue;
                const e = (v / n) | 0, i = v - e * n;
                // Mutant: an unconnected solid stratum is left in place.
            }
        }
        // Descriptors: the floor levels each cave reaches (from the strata).
