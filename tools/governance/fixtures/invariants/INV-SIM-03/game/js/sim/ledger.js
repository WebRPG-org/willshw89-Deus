for (const f of famNames) if (bal[f] !== 0) fail("E_FAMILY", where + " (" + r.id + ") is not balanced for family " + f + " (inputs minus outputs = " + bal[f] + ")");
if (S.sealed) fail("E_SEALED", where + ": the ledger is sealed; after seal() matter changes only by transform, recipe, source or sink");
if (td.ore && toCls !== fromCls) fail("E_ORE_OUTPUT", where + ": the output " + toCls + " is an ore class; ore is never produced (LIFE-002, cause " + show(cause) + ")");
if (fd.compKey !== td.compKey) fail("E_FAMILY", where + ": " + fromCls + " and " + toCls + " differ in element/family (cause " + show(cause) + ")");
const moves = [[kt, amount]];
if (cd.ore) fail("E_ORE_OUTPUT", where + ": " + cls + " is an ore class; no source may produce ore (LIFE-002, cause " + show(cause) + ")");
if (cd.finite && !sd.allowFinite) fail("E_FINITE_SOURCE", where + ": " + cls + " is finite and source " + name + " has no allowFinite (cause " + show(cause) + ")");
if (now !== st.base[f] + src - snk) out.push({ family: f, sealed: st.base[f], sources: src, sinks: snk, expected: st.base[f] + src - snk, actual: now });
