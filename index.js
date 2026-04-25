import { eventSource, event_types } from "../../../../script.js";
import { getContext } from "../../../../extensions.js";

const STORAGE_KEY = "world_auto_switch_map";

// 内存缓存
let characterWorldMap = loadMap();

// 上一个角色
let lastCharacterId = null;

// ---------- 工具函数 ----------

// 读取映射
function loadMap() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}

// 保存映射
function saveMap() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(characterWorldMap));
}

// 获取当前角色ID（比name稳定）
function getCharacterId() {
    const context = getContext();
    return context?.character?.avatar;
}

// 获取当前世界书列表
function getCurrentWorlds() {
    const context = getContext();
    return context?.worldInfo?.map(w => w.name) || [];
}

// 清空世界书
async function clearWorlds() {
    const context = getContext();
    if (!context?.worldInfo) return;

    for (const wi of [...context.worldInfo]) {
        await context.removeWorldInfo(wi.name);
    }
}

// 加载世界书列表
async function loadWorlds(worldList) {
    const context = getContext();
    for (const name of worldList) {
        await context.addWorldInfo(name);
    }
}

// ---------- 核心逻辑 ----------

async function onCharacterChanged() {
    const context = getContext();
    const currentId = getCharacterId();

    // ---------- 1️⃣ 保存“旧角色”的世界书 ----------
    if (lastCharacterId) {
        const worlds = getCurrentWorlds();

        if (worlds.length > 0) {
            characterWorldMap[lastCharacterId] = worlds;
            saveMap();

            console.log("[WorldAuto] Saved:", lastCharacterId, worlds);
        }
    }

    // ---------- 2️⃣ 切换到新角色 ----------
    if (!currentId) return;

    // 清空当前世界书
    await clearWorlds();

    // 加载新角色的世界书（如果存在）
    const targetWorlds = characterWorldMap[currentId];

    if (targetWorlds && targetWorlds.length > 0) {
        await loadWorlds(targetWorlds);
        console.log("[WorldAuto] Loaded:", currentId, targetWorlds);
    } else {
        console.log("[WorldAuto] No saved worlds for:", currentId);
    }

    // ---------- 3️⃣ 更新 lastCharacter ----------
    lastCharacterId = currentId;
}

// 注册事件
eventSource.on(event_types.CHARACTER_CHANGED, onCharacterChanged);

console.log("[WorldAuto] Loaded");