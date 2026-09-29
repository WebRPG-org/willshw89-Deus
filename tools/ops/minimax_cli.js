#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const https = require("https");

const API_KEY = process.env.MINIMAX_API_KEY;
if (!API_KEY) {
    console.error("MINIMAX_API_KEY is not set; refusing to run (never hard-code keys in this file).");
    process.exit(2);
}
const API_HOST = "api.minimaxi.chat";
const API_PATH = "/v1/chat/completions";
const MODEL = process.env.MINIMAX_MODEL || "MiniMax-Text-01";

function parseArgs() {
    const args = process.argv.slice(2);
    let prompt = "";
    let promptFile = "";
    let systemPrompt = "You are MiniMax, an expert software engineer working on Project DEUS under strict binding rules: DEC-007 Art Freeze (zero art generation) and DEC-037 Natural World Phase Lock.";
    let systemPromptFile = "";

    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--prompt-file" && i + 1 < args.length) {
            promptFile = args[++i];
        } else if (args[i] === "--system-prompt-file" && i + 1 < args.length) {
            systemPromptFile = args[++i];
        } else if (args[i] === "--system" && i + 1 < args.length) {
            systemPrompt = args[++i];
        } else if (!prompt) {
            prompt = args[i];
        }
    }

    if (promptFile && fs.existsSync(promptFile)) {
        prompt = fs.readFileSync(promptFile, "utf8");
    }
    if (systemPromptFile && fs.existsSync(systemPromptFile)) {
        systemPrompt = fs.readFileSync(systemPromptFile, "utf8");
    }

    return { prompt, systemPrompt };
}

async function queryMiniMax(systemPrompt, userPrompt) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            model: MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.2,
            max_tokens: 4096
        });

        const req = https.request({
            hostname: API_HOST,
            path: API_PATH,
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload)
            }
        }, res => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                if (res.statusCode !== 200) {
                    return reject(new Error(`MiniMax API HTTP ${res.statusCode}: ${data}`));
                }
                try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices && parsed.choices[0] && parsed.choices[0].message && parsed.choices[0].message.content;
                    resolve(content || "");
                } catch (e) {
                    reject(new Error(`Failed to parse MiniMax response: ${e.message}\nRaw: ${data}`));
                }
            });
        });

        req.on("error", reject);
        req.write(payload);
        req.end();
    });
}

async function main() {
    const { prompt, systemPrompt } = parseArgs();
    if (!prompt) {
        console.error("Usage: node tools/ops/minimax_cli.js [--prompt-file <path>] [prompt text]");
        process.exit(1);
    }

    try {
        const result = await queryMiniMax(systemPrompt, prompt);
        process.stdout.write(result + "\n");
        process.exit(0);
    } catch (err) {
        console.error("MiniMax Error:", err.message);
        process.exit(1);
    }
}

main();
