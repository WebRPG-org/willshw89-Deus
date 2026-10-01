"use strict";

// Reproducible detector-unit evidence, distinct from the actual repository gate.
// This synthetic inventory contains only the protected live plugins and the
// real archived shims. No checkout files are mutated.
const assert = require("assert/strict");
const path = require("path");
const root = path.resolve(__dirname, "../../../..");
const gate = require(path.join(root, "tools/test_no_loadscript_shims.js"));
const real = gate.inventory();
const fixture = {
    live: new Map(["UF_Households.js", "UF_Time.js"].map(name => {
        const file = "game/js/plugins/" + name;
        assert.ok(real.live.has(file));
        return [file, real.live.get(file)];
    })),
    archived: new Map(real.archived),
    tools: new Map()
};
assert.equal(gate.check(fixture).failures.length, 0);
let cases = 1;
for (const file of fixture.archived.keys()) {
    const state = { ...fixture, archived: new Map(fixture.archived) };
    state.archived.delete(file);
    assert.ok(gate.check(state).failures.some(f => f.includes("missing-archive")), file);
    cases++;
}
for (const name of ["Households", "Time"]) {
    const state = { ...fixture, live: new Map(fixture.live) };
    state.live.delete("game/js/plugins/UF_" + name + ".js");
    assert.ok(gate.check(state).failures.some(f => f.includes("moved-protected")), name);
    cases++;
}
for (const source of [
    'require("../game/js/plugins/UF_Anim.js");',
    'require("../archive/game/js/plugins/UF_Anim.js");',
    'require("../game/js/plugins/UF_Anim");',
    'import("../game/js/plugins/UF_Anim.js");',
    'import x from "../game/js/plugins/UF_Anim.js";',
    'import x from "../game/js/plugins/UF_Anim";',
    'import "../game/js/plugins/UF_Anim";',
    'require(path.join(root, "game", "js", "plugins", "UF_Anim.js"));',
    'readPlugin("UF_Anim");',
    'const plugins = ["UF_Anim.js"];',
    'plugins.push({ name: "UF_Anim", status: true });'
]) {
    const state = { ...fixture, tools: new Map([["tools/TEST_Check.js", source]]) };
    assert.ok(gate.check(state).failures.some(f => f.includes("broken-retarget")), source);
    cases++;
}
for (const source of [
    'PluginManager.parameters("UF_Anim");',
    'require("../game/js/plugins/UF_Time.js");',
    'require("../game/js/plugins/UF_Households.js");',
    'require("../game/js/plugins/DEUS_Anim.js");',
    '// require("../game/js/plugins/UF_Anim.js");'
]) {
    const state = { ...fixture, tools: new Map([["tools/TEST_Check.js", source]]) };
    assert.equal(gate.check(state).failures.length, 0, source);
    cases++;
}
console.log(`PASS detector fixtures: ${cases} cases (synthetic clean inventory, missing archives, protected plugins, import forms, retained parameters).`);
