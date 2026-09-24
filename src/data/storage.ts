import { STORAGE_KEY } from "./constants";
import { createSeedState } from "./seed";
import type { StudioState } from "../domain/types";

// 数据持久化：关闭页面重开后仍能接着处理。只负责读写，不包含业务规则。
export function loadState(): StudioState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed = JSON.parse(raw) as Partial<StudioState>;
    // 基本结构校验，损坏时回退到种子数据，避免页面崩溃
    if (!Array.isArray(parsed.batches) || !Array.isArray(parsed.gems)) {
      return createSeedState();
    }
    return {
      batches: parsed.batches,
      gems: parsed.gems,
      batchSeq: typeof parsed.batchSeq === "number" ? parsed.batchSeq : parsed.batches.length,
    };
  } catch {
    return createSeedState();
  }
}

export function saveState(state: StudioState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储满或隐私模式下静默失败，不影响当前会话操作
  }
}

export function resetState(): StudioState {
  const seed = createSeedState();
  saveState(seed);
  return seed;
}
