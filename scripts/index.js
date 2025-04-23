import { debugDrawer, DebugLine } from "@minecraft/debug-utilities";
import { model } from "./obj/cat.js";
import { system, world } from "@minecraft/server";

let totalLineCount = 0;

const playerSpawnEvent = world.afterEvents.playerSpawn.subscribe(() => {
    const loadedModel = loadOBJ(model);
    system.runJob(renderOBJ(loadedModel, { x: 0, y: 200, z: 0 }, 0.1, 1, { x: 400, y: 400, z: 0}));

    world.afterEvents.playerSpawn.unsubscribe(playerSpawnEvent);
});

function loadOBJ(obj) {
    const verts = [];
    const faces = [];
    for (const line of obj.split("\n")) {
        const parts = line.trim().split(/\s+/);
        if (parts[0] === "v") {
            verts.push({ x: parseFloat(parts[1]), y: parseFloat(parts[2]), z: parseFloat(parts[3]) });
        } else if (parts[0] === "f") {
            faces.push(parts.slice(1).map((p) => parseInt(p.split("/")[0], 10) - 1));
        }
    }
    return { vertices: verts, faces };
}

function normalize(v) {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function cross(a, b) {
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x,
    };
}

function sub(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

function* renderOBJ(model, startPos, scale = 1, fill = 1, lightPos = { x: 10, y: 20, z: 10 }) {
    for (const face of model.faces) {
        const len = face.length;
        let faceNormal = { x: 0, y: 1, z: 0 };
        let faceCenter = { x: 0, y: 0, z: 0 };
        if (len >= 3) {
            const v0 = model.vertices[face[0]];
            const v1 = model.vertices[face[1]];
            const v2 = model.vertices[face[2]];
            const edge1 = sub(v1, v0);
            const edge2 = sub(v2, v0);
            faceNormal = normalize(cross(edge1, edge2));
            faceCenter = {
                x: (v0.x + v1.x + v2.x) / 3,
                y: (v0.y + v1.y + v2.y) / 3,
                z: (v0.z + v1.z + v2.z) / 3,
            };
        }
        const lightVec = normalize({
            x: lightPos.x - (startPos.x + faceCenter.x * scale),
            y: lightPos.y - (startPos.y + faceCenter.y * scale),
            z: lightPos.z - (startPos.z + faceCenter.z * scale),
        });
        const brightness = Math.max(0.15, dot(faceNormal, lightVec));

        for (let i = 0; i < len; i++) {
            const a = model.vertices[face[i]];
            const b = model.vertices[face[(i + 1) % len]];
            const from = {
                x: startPos.x + a.x * scale,
                y: startPos.y + a.y * scale,
                z: startPos.z + a.z * scale,
            };
            const to = {
                x: startPos.x + b.x * scale,
                y: startPos.y + b.y * scale,
                z: startPos.z + b.z * scale,
            };
            const line = new DebugLine(from, to);
            line.color = { red: brightness, green: brightness, blue: brightness };
            debugDrawer.addShape(line);
            totalLineCount++;
        }

        if (fill > 1 && len === 3) {
            const [i0, i1, i2] = face;
            const v0 = model.vertices[i0];
            const v1 = model.vertices[i1];
            const v2 = model.vertices[i2];

            for (let row = 1; row < fill; row++) {
                for (let col = 0; col < row + 1; col++) {
                    const a = 1 - row / fill;
                    const b = (row - col) / fill;
                    const c = col / fill;
                    const p = {
                        x: startPos.x + (v0.x * a + v1.x * b + v2.x * c) * scale,
                        y: startPos.y + (v0.y * a + v1.y * b + v2.y * c) * scale,
                        z: startPos.z + (v0.z * a + v1.z * b + v2.z * c) * scale,
                    };
                    const pointLightVec = normalize({
                        x: lightPos.x - p.x,
                        y: lightPos.y - p.y,
                        z: lightPos.z - p.z,
                    });
                    const pointBrightness = Math.max(0.15, dot(faceNormal, pointLightVec));
                    const color = { red: pointBrightness, green: pointBrightness, blue: pointBrightness };
        
                    let line = new DebugLine(p, {
                        x: startPos.x + v0.x * scale,
                        y: startPos.y + v0.y * scale,
                        z: startPos.z + v0.z * scale,
                    });
                    line.color = color;
                    debugDrawer.addShape(line);
        
                    line = new DebugLine(p, {
                        x: startPos.x + v1.x * scale,
                        y: startPos.y + v1.y * scale,
                        z: startPos.z + v1.z * scale,
                    });
                    line.color = color;
                    debugDrawer.addShape(line);
        
                    line = new DebugLine(p, {
                        x: startPos.x + v2.x * scale,
                        y: startPos.y + v2.y * scale,
                        z: startPos.z + v2.z * scale,
                    });
                    totalLineCount += 3;
                    line.color = color;
                    debugDrawer.addShape(line);
                }
            }
        }
        yield;
    }
    world.sendMessage(`Loaded model with ${totalLineCount} lines`);
}
