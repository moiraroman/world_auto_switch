import { eventSource, event_types } from "../../../../script.js";
import { getContext } from "../../../../extensions.js";
import { selected_world_info, world_names } from "../../../world-info.js";

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

// 获取当前角色ID（使用 characterId 索引取 avatar）
function getCharacterId() {
    const context = getContext();
    const chid = context.characterId;
    if (chid === undefined || chid === null) return null;
    return context.characters[chid]?.avatar;
}

// 获取当前全局世界书列表（从 selected_world_info 读取）
function getCurrentWorlds() {
    return [...selected_world_info];
}

// 清空全局世界书选择
function clearWorlds() {
    selected_world_info.length = 0;
    // 同步 UI：取消所有选中项
    $('#world_info option').prop('selected', false);
    $('#world_info').trigger('change');
}

// 加载世界书列表到全局选择
function loadWorlds(worldList) {
    // 逐个添加到 selected_world_info 并选中对应 option
    for (const name of worldList) {
        if (world_names.includes(name) && !selected_world_info.includes(name)) {
            selected_world_info.push(name);
        }
    }
    // 同步 UI：选中对应 option
    for (const name of worldList) {
        const wiElement = $('#world_info').children().filter(function () {
            return $(this).text().toLowerCase() === name.toLowerCase();
        });
        if (wiElement.length) {
            wiElement.prop('selected', true);
        }
    }
    $('#world_info').trigger('change');
}

// ---------- 核心逻辑 ----------

async function onChatChanged() {
    const currentId = getCharacterId();

    // ---------- 1️⃣ 保存"旧角色"的世界书 ----------
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
    clearWorlds();

    // 加载新角色的世界书（如果存在）
    const targetWorlds = characterWorldMap[currentId];

    if (targetWorlds && targetWorlds.length > 0) {
        loadWorlds(targetWorlds);
        console.log("[WorldAuto] Loaded:", currentId, targetWorlds);
    } else {
        console.log("[WorldAuto] No saved worlds for:", currentId);
    }

    // ---------- 3️⃣ 更新 lastCharacter ----------
    lastCharacterId = currentId;
}

// 注册事件：CHAT_CHANGED 在切换角色/聊天时触发
eventSource.on(event_types.CHAT_CHANGED, onChatChanged);

console.log("[WorldAuto] Loaded");
