import { eventSource, event_types } from "../../../../script.js";
import { getContext } from "../../../../extensions.js";
import { selected_world_info, world_names, onWorldInfoChange } from "../../../world-info.js";

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

// 获取当前全局世界书列表（通过 live binding 读取，始终是最新值）
function getCurrentWorlds() {
    return [...selected_world_info];
}

// 清空全局世界书：使用 SillyTavern 官方 API（等价于 /world 无参数）
// 内部会同时处理 selected_world_info 重赋值 + Select2 UI 同步 + saveSettings
function clearWorlds() {
    onWorldInfoChange({ silent: true }, '');
}

// 加载世界书列表：使用 SillyTavern 官方 API（等价于 /world state=on World1,World2）
// 内部会 push 到 selected_world_info + 选中 option + trigger('change') 同步 UI
function loadWorlds(worldList) {
    const validWorlds = worldList.filter(name => world_names.includes(name));
    if (validWorlds.length > 0) {
        onWorldInfoChange({ state: 'on', silent: true }, validWorlds.join(','));
    }
}

// ---------- 核心逻辑 ----------

async function onChatChanged() {
    const currentId = getCharacterId();

    if (!currentId) return;

    // 首次加载：只记录当前状态，不做任何修改
    if (lastCharacterId === null) {
        lastCharacterId = currentId;
        const worlds = getCurrentWorlds();
        if (worlds.length > 0) {
            characterWorldMap[currentId] = worlds;
            saveMap();
        }
        console.log("[WorldAuto] Initial:", currentId, worlds);
        return;
    }

    // 同一角色切换聊天：无需切换世界书
    if (currentId === lastCharacterId) {
        return;
    }

    // ---------- 1️⃣ 保存「旧角色」的世界书 ----------
    const worlds = getCurrentWorlds();
    if (worlds.length > 0) {
        characterWorldMap[lastCharacterId] = worlds;
        saveMap();
        console.log("[WorldAuto] Saved:", lastCharacterId, worlds);
    }

    // ---------- 2️⃣ 清空 → 加载「新角色」的世界书 ----------
    clearWorlds();

    const targetWorlds = characterWorldMap[currentId];
    if (targetWorlds && targetWorlds.length > 0) {
        loadWorlds(targetWorlds);
        console.log("[WorldAuto] Loaded:", currentId, targetWorlds);
    } else {
        console.log("[WorldAuto] No saved worlds for:", currentId);
    }

    // ---------- 3️⃣ 更新 lastCharacterId ----------
    lastCharacterId = currentId;
}

// 注册事件：CHAT_CHANGED 在切换角色/聊天时触发
eventSource.on(event_types.CHAT_CHANGED, onChatChanged);

console.log("[WorldAuto] Loaded");
