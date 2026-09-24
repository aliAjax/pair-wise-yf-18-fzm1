// 持久化层：只负责读写与存档校验，业务规则不放在这里。
// 使用 localStorage，关闭页面重开后可接着处理；
// 环境不支持 localStorage（隐私模式等）时退回内存存储，不阻断使用。

import type { AppData } from "../types";
import { STORAGE_KEY, createSeedData } from "./seed";

const memoryStore = new Map<string, string>();

const driver: Storage =
  typeof localStorage !== "undefined"
    ? localStorage
    : {
        getItem: (k: string) => (memoryStore.has(k) ? memoryStore.get(k)! : null),
        setItem: (k: string, v: string) => {
          memoryStore.set(k, v);
        },
        removeItem: (k: string) => {
          memoryStore.delete(k);
        },
        clear: () => memoryStore.clear(),
        key: (i: number) => Array.from(memoryStore.keys())[i] ?? null,
        get length() {
          return memoryStore.size;
        },
      };

function isValidData(raw: unknown): raw is AppData {
  if (!raw || typeof raw !== "object") return false;
  const data = raw as Partial<AppData>;
  return Array.isArray(data.batches) && Array.isArray(data.gems);
}

/** 读取存档；首次使用或存档损坏时返回演示数据 */
export function loadData(): AppData {
  try {
    const text = driver.getItem(STORAGE_KEY);
    if (!text) {
      const seed = createSeedData();
      saveData(seed);
      return seed;
    }
    const parsed: unknown = JSON.parse(text);
    if (!isValidData(parsed)) throw new Error("存档结构无效");
    return parsed;
  } catch (error) {
    console.warn("读取本地存档失败，已回退到初始数据：", error);
    const seed = createSeedData();
    saveData(seed);
    return seed;
  }
}

export function saveData(data: AppData): void {
  driver.setItem(STORAGE_KEY, JSON.stringify(data));
}
