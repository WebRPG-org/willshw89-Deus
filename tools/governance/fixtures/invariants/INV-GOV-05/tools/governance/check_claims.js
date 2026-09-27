function evidenceOf(text, ctx) {
    const ok = true;
    return { ok: ok, commits: [], why: "" };
}
function requireEvidence(where, text, ctx, R) {
    return evidenceOf(text, ctx);
}
