"use strict";
// Posts spill, collapse, burn and rot through the existing ledger API.
// This file does not change ledger rules. Every step is one transform() the default table already allows.
// massCp on a catalog row is the integer centipound amount posted.

function applyPlan(ledger, plan) {
    if (!ledger) return;
    for (let i = 0; i < plan.length; i++) {
        const step = plan[i];
        if (!step.amount) continue;
        ledger.transform(step.fromCls, step.fromForm, step.toCls, step.toForm, step.amount, step.cause);
    }
}

function recount(items, deposits) {
    const out = {};
    function add(cls, form, n) {
        if (!n) return;
        if (!out[cls]) out[cls] = {};
        out[cls][form] = (out[cls][form] || 0) + n;
    }
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.massCp) add(item.ledgerClass, item.ledgerForm, item.massCp);
    }
    for (let i = 0; i < deposits.length; i++) {
        const d = deposits[i];
        add(d.cls, d.form, d.amount);
    }
    return out;
}

module.exports = { applyPlan, recount };
