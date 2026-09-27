"use strict";
// Min-heap keyed by (dueYt, packed id). Host-agnostic. Equal instants order by id.

function less(a, b) {
    if (a.dueYt !== b.dueYt) return a.dueYt < b.dueYt;
    return a.packed < b.packed;
}

function createHeap() {
    const a = [];
    const at = new Map();

    function swap(i, j) {
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
        at.set(a[i].packed, i);
        at.set(a[j].packed, j);
    }
    function up(i) {
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (!less(a[i], a[p])) break;
            swap(i, p);
            i = p;
        }
    }
    function down(i) {
        const n = a.length;
        while (true) {
            let m = i;
            const l = i * 2 + 1;
            const r = l + 1;
            if (l < n && less(a[l], a[m])) m = l;
            if (r < n && less(a[r], a[m])) m = r;
            if (m === i) break;
            swap(i, m);
            i = m;
        }
    }
    function push(entry) {
        if (at.has(entry.packed)) failDup();
        a.push(entry);
        at.set(entry.packed, a.length - 1);
        up(a.length - 1);
    }
    function failDup() {
        const e = new Error("duplicate heap id");
        e.code = "E_DUP";
        throw e;
    }
    function remove(packed) {
        const i = at.get(packed);
        if (i === undefined) return false;
        const last = a.pop();
        at.delete(packed);
        if (i < a.length) {
            a[i] = last;
            at.set(last.packed, i);
            up(i);
            down(i);
        }
        return true;
    }
    function pop() {
        if (a.length === 0) return null;
        const top = a[0];
        remove(top.packed);
        return top;
    }
    function peek() {
        return a.length ? a[0] : null;
    }
    function has(packed) {
        return at.has(packed);
    }
    function size() {
        return a.length;
    }
    return { push: push, pop: pop, peek: peek, remove: remove, has: has, size: size };
}

module.exports = { createHeap: createHeap };
