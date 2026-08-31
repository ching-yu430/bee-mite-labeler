// 蜂蟹蟎標註工具
// 每張照片依網格切成小格，狀態在「未標 / 正常 / 異常」間循環，
// 匯出時整理成 anomalib / PatchCore 慣用的 dataset/train/test 資料夾格式。

const STATE_CYCLE = ["unlabeled", "normal", "abnormal"];
const STATE_LABEL = { unlabeled: "未標", normal: "正常", abnormal: "異常" };

// 真實蜂箱照片情境之細分異常標籤定義
const ABNORMAL_TYPES = {
  mite: { label: "體表附蟎/落蟎", emoji: "🪲", code: "mite" },
  dwv: { label: "殘翅/畸形翅(DWV)", emoji: "🪽", code: "dwv" },
  debris: { label: "蠟屑/雜質", emoji: "🍂", code: "debris" },
  dead: { label: "死蜂/殘肢黑化", emoji: "💀", code: "dead" },
  other: { label: "其他可疑異狀", emoji: "❓", code: "other" }
};
let currentAbnormalType = "mite";
let currentZoomLevel = 3.0; // 預設放大鏡倍率
let globalFilter = ""; // 用來記錄目前的濾鏡參數，讓放大鏡強制套用

// A: 撤銷/重做堆疊
const undoStack = [];
const redoStack = [];
const MAX_UNDO = 200;

// J: 鍵盤導航
let keyboardNavActive = false;
let focusedTileIndex = -1;

/**
 * photos: {
 *   id: string,
 *   fileName: string,
 *   blockEl: HTMLElement,
 *   sidebarEl: HTMLElement,
 *   thumbUrl: string,
 *   tiles: {row, col, blob, state, abnormalType, el, photoName}[]
 * }[]
 */
let photos = [];
let photoCounter = 0;
let currentPhotoIndex = 0;

// 拖曳塗刷標註用的狀態
let isPainting = false;
let paintState = null;
// 目前滑鼠停留的格子（供鍵盤快捷鍵使用）
let hoveredTileRecord = null;

// DOM 元素
const photoInput = document.getElementById("photo-input");
const rowsInput = document.getElementById("rows-input");
const colsInput = document.getElementById("cols-input");
const overlapInput = document.getElementById("overlap-input");
const apiEndpointInput = document.getElementById("api-endpoint-input");
const anomalyThresholdInput = document.getElementById("anomaly-threshold-input");

const photosContainer = document.getElementById("photos-container");
const summaryPanel = document.getElementById("summary-panel");
const exportBtn = document.getElementById("export-btn");
const toast = document.getElementById("toast");
const zoomPreview = document.getElementById("zoom-preview");
const zoomPreviewImg = document.getElementById("zoom-preview-img");
const zoomPreviewCaption = document.getElementById("zoom-preview-caption");
const zoomBadge = document.getElementById("zoom-badge");

const sidebarOpenBtn = document.getElementById("sidebar-open-btn");
const photoBadge = document.getElementById("photo-badge");
const photoListDrawer = document.getElementById("photo-list-drawer");
const drawerCount = document.getElementById("drawer-count");
const drawerCloseBtn = document.getElementById("drawer-close-btn");
const sidebarList = document.getElementById("sidebar-list");
const sidebarClearAll = document.getElementById("sidebar-clear-all");

const abnormalTypeSelect = document.getElementById("abnormal-type-select");
const shortcutsToggleBtn = document.getElementById("shortcuts-toggle-btn");
const shortcutsModal = document.getElementById("shortcuts-modal");
const shortcutsCloseBtn = document.getElementById("shortcuts-close-btn");
const shortcutsConfirmBtn = document.getElementById("shortcuts-confirm-btn");

if (shortcutsToggleBtn && shortcutsModal) {
  shortcutsToggleBtn.addEventListener("click", () => {
    shortcutsModal.hidden = false;
  });
}

function closeShortcutsModal() {
  if (shortcutsModal) shortcutsModal.hidden = true;
}

if (shortcutsCloseBtn) shortcutsCloseBtn.addEventListener("click", closeShortcutsModal);
if (shortcutsConfirmBtn) shortcutsConfirmBtn.addEventListener("click", closeShortcutsModal);
if (shortcutsModal) {
  shortcutsModal.addEventListener("click", (e) => {
    if (e.target === shortcutsModal) closeShortcutsModal();
  });
}

// 匯出彈出視窗元素
const exportModal = document.getElementById("export-modal");
const modalCloseBtn = document.getElementById("modal-close-btn");
const modalCancelBtn = document.getElementById("modal-cancel-btn");
const modalConfirmExportBtn = document.getElementById("modal-confirm-export-btn");
const modalTestSplit = document.getElementById("modal-test-split");
const modalAugFlip = document.getElementById("modal-aug-flip");

const loadingOverlay = document.getElementById("loading-overlay");
const loadingText = document.getElementById("loading-text");

const settingsSidebar = document.getElementById("settings-sidebar");
const settingsToggleBtn = document.getElementById("settings-toggle-btn");
const settingsCloseBtn = document.getElementById("settings-close-btn");

const emptyState = document.getElementById("empty-state");
const emptyUploadBtn = document.getElementById("empty-upload-btn");
const floatingPager = document.getElementById("floating-pager");
const prevPhotoBtn = document.getElementById("prev-photo-btn");
const nextPhotoBtn = document.getElementById("next-photo-btn");
const pagerInfo = document.getElementById("pager-info");

// 濾鏡與放大鏡倍率
const filterBrightness = document.getElementById("filter-brightness");
const filterContrast = document.getElementById("filter-contrast");
const btnResetFilters = document.getElementById("btn-reset-filters");
const btnSharpen = document.getElementById("btn-sharpen");
const btnClahe = document.getElementById("btn-clahe");
const btnAiPredict = document.getElementById("btn-ai-predict");
const btnClearDb = document.getElementById("btn-clear-db");
const zoomLevelBtns = document.querySelectorAll(".zoom-level-btn");

// 事件綁定
photoInput.addEventListener("change", handleFiles);
exportBtn.addEventListener("click", openExportModal);

if (btnClearDb) {
  btnClearDb.addEventListener("click", () => {
    if (confirm("確定要清除瀏覽器本地暫存並重置專案嗎？")) {
      clearIndexedDB();
      clearAllPhotos();
      showToast("已清空本地暫存");
    }
  });
}

settingsToggleBtn.addEventListener("click", () => {
  settingsSidebar.classList.toggle("collapsed");
});
settingsCloseBtn.addEventListener("click", () => {
  settingsSidebar.classList.add("collapsed");
});

if (sidebarOpenBtn) {
  sidebarOpenBtn.addEventListener("click", () => {
    photoListDrawer.classList.toggle("collapsed");
  });
}
if (drawerCloseBtn) {
  drawerCloseBtn.addEventListener("click", () => {
    photoListDrawer.classList.add("collapsed");
  });
}
if (emptyUploadBtn) {
  emptyUploadBtn.addEventListener("click", () => {
    settingsSidebar.classList.remove("collapsed");
    photoInput.click();
  });
}

// 快速鍵折疊面板控制（已改用 shortcuts-modal 彈出視窗，不再使用舊的折疊面板）
// shortcutsPanel / shortcutsChevron 已移除，快速鍵指南改由 shortcutsModal 彈出顯示

// 左側異常類別下拉選單
if (abnormalTypeSelect) {
  abnormalTypeSelect.addEventListener("change", () => {
    selectAbnormalType(abnormalTypeSelect.value, false);
  });
}

function selectAbnormalType(typeKey, syncSelect = true) {
  if (!ABNORMAL_TYPES[typeKey]) return;
  currentAbnormalType = typeKey;
  if (syncSelect && abnormalTypeSelect) {
    abnormalTypeSelect.value = typeKey;
  }
  const typeInfo = ABNORMAL_TYPES[typeKey];
  showToast(`已切換異常類別：${typeInfo.emoji} ${typeInfo.label}`);
}

// 匯出彈出視窗（Modal）事件綁定
function openExportModal() {
  const tiles = allTiles();
  const normalTiles = tiles.filter(t => t.state === "normal");
  const abnormalTiles = tiles.filter(t => t.state === "abnormal");
  if (normalTiles.length === 0 && abnormalTiles.length === 0) {
    showToast("還沒有標記任何格子");
    return;
  }
  if (exportModal) {
    exportModal.hidden = false;
  }
}

function closeExportModal() {
  if (exportModal) {
    exportModal.hidden = true;
  }
}

if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeExportModal);
if (modalCancelBtn) modalCancelBtn.addEventListener("click", closeExportModal);
if (exportModal) {
  exportModal.addEventListener("click", (e) => {
    if (e.target === exportModal) closeExportModal();
  });
}
if (modalConfirmExportBtn) {
  modalConfirmExportBtn.addEventListener("click", () => {
    const checkedRadio = document.querySelector('input[name="export-format-choice"]:checked');
    const format = checkedRadio ? checkedRadio.value : "patchcore";
    const splitPercent = modalTestSplit ? parseFloat(modalTestSplit.value) || 10 : 10;
    const shouldAug = modalAugFlip ? modalAugFlip.checked : false;

    closeExportModal();
    doExportDataset(format, splitPercent, shouldAug);
  });
}

// 放大鏡倍率按鈕切換
zoomLevelBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const level = parseFloat(btn.dataset.zoom) || 3.0;
    setZoomLevel(level);
  });
});

function setZoomLevel(level) {
  currentZoomLevel = Math.max(1.5, Math.min(8.0, level));
  zoomLevelBtns.forEach(b => {
    b.classList.toggle("is-active", Math.abs(parseFloat(b.dataset.zoom) - currentZoomLevel) < 0.1);
  });
  if (zoomBadge) zoomBadge.textContent = `${currentZoomLevel.toFixed(1)}x`;
  if (zoomPreview) {
    zoomPreview.style.width = `${Math.round(100 * currentZoomLevel + 20)}px`;
  }
}

prevPhotoBtn.addEventListener("click", () => {
  if (currentPhotoIndex > 0) showPhoto(currentPhotoIndex - 1);
});
nextPhotoBtn.addEventListener("click", () => {
  if (currentPhotoIndex < photos.length - 1) showPhoto(currentPhotoIndex + 1);
});
sidebarClearAll.addEventListener("click", clearAllPhotos);

// =================== 影像調整濾鏡 (亮度/對比/銳化/對比增強/重設) ===================
function applyFilters() {
  const bVal = filterBrightness ? parseFloat(filterBrightness.value) : 100;
  const cVal = filterContrast ? parseFloat(filterContrast.value) : 100;
  const isSharpen = btnSharpen ? btnSharpen.classList.contains("is-active") : false;
  const isClahe = btnClahe ? btnClahe.classList.contains("is-active") : false;

  let bRatio = bVal / 100;
  let cRatio = cVal / 100;

  if (isClahe) {
    cRatio *= 1.4;
    bRatio *= 1.06;
  }

  let filterParts = [];
  filterParts.push(`brightness(${bRatio.toFixed(2)})`);
  filterParts.push(`contrast(${cRatio.toFixed(2)})`);
  if (isSharpen) {
    filterParts.push(`saturate(1.25) drop-shadow(0 0 1px rgba(0,0,0,0.95))`);
  }

  const finalFilter = filterParts.join(" ");
  globalFilter = finalFilter;
  if (zoomPreviewImg) {
    zoomPreviewImg.style.filter = finalFilter;
    if(zoomPreview) zoomPreview.style.filter = finalFilter;
    zoomPreviewImg.style.webkitFilter = finalFilter;
    if(zoomPreview) zoomPreview.style.webkitFilter = finalFilter;
  }

  // 1. 動態建立或更新 <style id="live-filter-style">，以最高優先級覆蓋所有照片切格、大圖與懸浮放大鏡
  let styleEl = document.getElementById("live-filter-style");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "live-filter-style";
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `
    .tile-grid, .tile-grid img, .tile img, .photos-container img, .tile-grid-wrap img, #zoom-preview, #zoom-preview img, .zoom-preview img, #zoom-preview-img {
      filter: ${finalFilter} !important;
      -webkit-filter: ${finalFilter} !important;
    }
  `;

  // 2. 同步更新 photosContainer CSS 變數與 inline style
  if (photosContainer) {
    photosContainer.style.setProperty("--grid-brightness", (bVal / 100).toFixed(2));
    photosContainer.style.setProperty("--grid-contrast", (cVal / 100).toFixed(2));
  }

  document.querySelectorAll(".tile-grid, .tile img, .tile, #zoom-preview img, #zoom-preview-img").forEach(el => {
    el.style.filter = finalFilter;
  });
}

if (filterBrightness) {
  filterBrightness.addEventListener("input", applyFilters);
  filterBrightness.addEventListener("change", applyFilters);
}

if (filterContrast) {
  filterContrast.addEventListener("input", applyFilters);
  filterContrast.addEventListener("change", applyFilters);
}

if (btnResetFilters) {
  btnResetFilters.addEventListener("click", () => {
    if (filterBrightness) filterBrightness.value = 100;
    if (filterContrast) filterContrast.value = 100;
    if (btnSharpen) btnSharpen.classList.remove("is-active");
    if (btnClahe) btnClahe.classList.remove("is-active");
    if (photosContainer) photosContainer.classList.remove("is-sharpen", "is-clahe");
    applyFilters();
    setZoomLevel(3.0);
    showToast("已重設影像亮度、對比度與濾鏡");
  });
}

if (btnSharpen) {
  btnSharpen.addEventListener("click", () => {
    btnSharpen.classList.toggle("is-active");
    if (photosContainer) photosContainer.classList.toggle("is-sharpen", btnSharpen.classList.contains("is-active"));
    applyFilters();
    showToast(btnSharpen.classList.contains("is-active") ? "⚡ 已開啟蜂體邊緣銳化" : "已關閉銳化");
  });
}

if (btnClahe) {
  btnClahe.addEventListener("click", () => {
    btnClahe.classList.toggle("is-active");
    if (photosContainer) photosContainer.classList.toggle("is-clahe", btnClahe.classList.contains("is-active"));
    applyFilters();
    showToast(btnClahe.classList.contains("is-active") ? "🔆 已開啟對比增強" : "已關閉對比增強");
  });
}

// AI 即時推論 (Tailscale / API)
if (btnAiPredict) {
  btnAiPredict.addEventListener("click", runAiPrediction);
}

async function runAiPrediction() {
  if (photos.length === 0) {
    showToast("請先上傳照片");
    return;
  }
  const currentPhoto = photos[currentPhotoIndex];
  if (!currentPhoto || currentPhoto.tiles.length === 0) return;

  const endpoint = (apiEndpointInput && apiEndpointInput.value.trim()) || "http://localhost:8000/predict";
  const threshold = (anomalyThresholdInput && parseFloat(anomalyThresholdInput.value)) || 0.5;

  showLoading(`正在透過 Tailscale API 連線推論 (${currentPhoto.fileName})…`);

  try {
    const formData = new FormData();
    formData.append("filename", currentPhoto.fileName);
    currentPhoto.tiles.forEach((t, i) => {
      formData.append(`tile_${i}`, t.blob, `${t.photoName}_r${t.row}_c${t.col}.jpg`);
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
      signal: controller.signal
    }).catch(err => {
      throw new Error(`無法連線至 ${endpoint}。請確認後端已啟動且 Tailscale IP 正確。`);
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`伺服器回應錯誤碼: ${response.status}`);
    }

    const data = await response.json();
    let abnormalCount = 0;

    currentPhoto.tiles.forEach((t, idx) => {
      const pred = (data.predictions && data.predictions[idx]) || {};
      const score = pred.score ?? (pred.is_anomaly ? 1 : 0);
      const isAbnormal = score >= threshold;
      setTileState(t, t.el, isAbnormal ? "abnormal" : "normal");
      if (isAbnormal) abnormalCount++;
    });

    showToast(`AI 推論完成！標出 ${abnormalCount} 個異常格，其餘設為正常`);
    updateSummary();

  } catch (err) {
    console.warn("AI Prediction notice:", err);
    showToast(err.message || "推論連線失敗，請檢查 API 設定");
  } finally {
    hideLoading();
  }
}

showPhoto(0);

// 拖曳塗刷結束偵測（放開滑鼠 / 觸控、游標離開視窗都要結束）
document.addEventListener("pointerup", stopPainting);
document.addEventListener("pointercancel", stopPainting);
window.addEventListener("blur", stopPainting);
document.addEventListener("pointermove", (ev) => {
  if (ev.buttons === 0 && isPainting) {
    stopPainting();
  }
});

// 快速鍵映射表 (Q/W/E/R/T 對應 5 種異常類別)
const KEY_TO_ABNORMAL_TYPE = {
  q: "mite", Q: "mite",
  w: "dwv", W: "dwv",
  e: "debris", E: "debris",
  r: "dead", R: "dead",
  t: "other", T: "other"
};

// 鍵盤快捷鍵：
// 1. 全域：← / A 上一張、→ / D 下一張、N 一鍵設未標為正常、Q/W/E/R/T 切換異常類別
// 2. 游標停在格子上時：
//    - 1=正常
//    - 2=當前選取的異常
//    - Q/W/E/R/T=直接設為該特定異常類別！
//    - 0/Backspace=清除
document.addEventListener("keydown", (e) => {
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

  // A: Ctrl+Z 撤銷 / Ctrl+Y 重做
  if ((e.ctrlKey || e.metaKey) && e.key === "z") {
    e.preventDefault();
    performUndo();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === "y") {
    e.preventDefault();
    performRedo();
    return;
  }

  // J: F 鍵切換鍵盤導航模式
  if (e.key === "f" || e.key === "F") {
    if (!e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      keyboardNavActive = !keyboardNavActive;
      if (keyboardNavActive) {
        const cp = photos[currentPhotoIndex];
        if (cp && cp.tiles.length > 0) {
          focusedTileIndex = 0;
          updateTileFocus(cp);
          showToast("⌨️ 鍵盤導航已開啟 — 用方向鍵移動，1/2/0 標記");
        }
      } else {
        clearTileFocus();
        showToast("鍵盤導航已關閉");
      }
      return;
    }
  }

  // J: 方向鍵導航切格
  if (keyboardNavActive && photos[currentPhotoIndex]) {
    const cp = photos[currentPhotoIndex];
    const cols = parseInt(cp.blockEl.querySelector(".tile-grid").style.gridTemplateColumns.match(/\d+/)?.[0] || "8");
    const totalTiles = cp.tiles.length;
    if (totalTiles === 0) return;

    let newIdx = focusedTileIndex;
    if (e.key === "ArrowRight") { newIdx = Math.min(totalTiles - 1, focusedTileIndex + 1); }
    else if (e.key === "ArrowLeft") { newIdx = Math.max(0, focusedTileIndex - 1); }
    else if (e.key === "ArrowDown") { newIdx = Math.min(totalTiles - 1, focusedTileIndex + cols); }
    else if (e.key === "ArrowUp") { newIdx = Math.max(0, focusedTileIndex - cols); }

    if (newIdx !== focusedTileIndex && (e.key.startsWith("Arrow"))) {
      e.preventDefault();
      focusedTileIndex = newIdx;
      updateTileFocus(cp);
      // 讓焦點格等同 hoveredTileRecord，這樣 1/2/0 快捷鍵可以直接操作
      hoveredTileRecord = cp.tiles[focusedTileIndex];
      const focusedTile = cp.tiles[focusedTileIndex];
      showZoomPreview(focusedTile.el.querySelector("img").src, focusedTile);
      return;
    }
  }

  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
    if (currentPhotoIndex > 0) {
      e.preventDefault();
      showPhoto(currentPhotoIndex - 1);
      return;
    }
  } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
    if (currentPhotoIndex < photos.length - 1) {
      e.preventDefault();
      showPhoto(currentPhotoIndex + 1);
      return;
    }
  } else if (e.key === "n" || e.key === "N") {
    if (photos[currentPhotoIndex]) {
      e.preventDefault();
      markPhotoAllNormal(photos[currentPhotoIndex]);
      return;
    }
  }

  // 檢查是否為 Q/W/E/R/T 鍵
  const matchedType = KEY_TO_ABNORMAL_TYPE[e.key];

  if (hoveredTileRecord) {
    if (matchedType) {
      e.preventDefault();
      selectAbnormalType(matchedType);
      hoveredTileRecord.abnormalType = matchedType;
      setTileState(hoveredTileRecord, hoveredTileRecord.el, "abnormal");
      updateSummary();
      showZoomPreview(hoveredTileRecord.el.querySelector("img").src, hoveredTileRecord);
      return;
    }

    let newState = null;
    if (e.key === "1") newState = "normal";
    else if (e.key === "2") newState = "abnormal";
    else if (e.key === "0" || e.key === "Backspace") newState = "unlabeled";

    if (newState) {
      e.preventDefault();
      setTileState(hoveredTileRecord, hoveredTileRecord.el, newState);
      updateSummary();
      showZoomPreview(hoveredTileRecord.el.querySelector("img").src, hoveredTileRecord);
      return;
    }
  } else if (matchedType) {
    // 游標不在格子上時，Q/W/E/R/T 切換左側選取的異常類別
    e.preventDefault();
    selectAbnormalType(matchedType);
  }
});

// 若已有標記卻不小心重新整理／關閉分頁，跳出瀏覽器確認提示
window.addEventListener("beforeunload", (e) => {
  if (!allTiles().some(t => t.state !== "unlabeled")) return;
  e.preventDefault();
  e.returnValue = "";
});

function stopPainting() {
  isPainting = false;
  paintState = null;
}

// J: 鍵盤導航輔助函數
function updateTileFocus(photo) {
  clearTileFocus();
  if (focusedTileIndex >= 0 && focusedTileIndex < photo.tiles.length) {
    photo.tiles[focusedTileIndex].el.classList.add("tile-focused");
    photo.tiles[focusedTileIndex].el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

function clearTileFocus() {
  document.querySelectorAll(".tile-focused").forEach(el => el.classList.remove("tile-focused"));
  focusedTileIndex = -1;
}

function showPhoto(index) {
  if (photos.length === 0) {
    if (emptyState) emptyState.hidden = false;
    floatingPager.hidden = true;
    currentPhotoIndex = 0;
    return;
  }

  if (emptyState) emptyState.hidden = true;
  currentPhotoIndex = Math.max(0, Math.min(index, photos.length - 1));
  floatingPager.hidden = false;
  pagerInfo.textContent = `${currentPhotoIndex + 1} / ${photos.length}`;

  prevPhotoBtn.disabled = (currentPhotoIndex <= 0);
  nextPhotoBtn.disabled = (currentPhotoIndex >= photos.length - 1);

  photos.forEach((p, i) => {
    const isActive = (i === currentPhotoIndex);
    p.blockEl.hidden = !isActive;
    p.sidebarEl.classList.toggle("is-active", isActive);
  });

  applyFilters();
  photos[currentPhotoIndex].sidebarEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

async function handleFiles(e) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;

  const prevTotal = photos.length;
  const rows = clampInt(rowsInput.value, 1, 16, 4);
  const cols = clampInt(colsInput.value, 1, 16, 8);
  const overlap = clampInt(overlapInput.value, 0, 100, 15);

  photoInput.disabled = true;
  showLoading(`處理照片中 (0/${files.length})`);

  try {
    for (let i = 0; i < files.length; i++) {
      updateLoadingText(`處理照片中 (${i + 1}/${files.length})：${escapeForToast(files[i].name)}`);
      await nextFrame(); // 讓進度文字先畫出來，再進行同步的切格運算
      try {
        await addPhoto(files[i], rows, cols, overlap);
      } catch (err) {
        console.error(err);
        showToast(`「${files[i].name}」讀取失敗，已略過`);
      }
    }
  } finally {
    photoInput.disabled = false;
    hideLoading();
  }

  photoInput.value = "";
  settingsSidebar.classList.add("collapsed");
  showPhoto(prevTotal < photos.length ? prevTotal : 0);
  updateSummary();
}

function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function clampInt(v, min, max, fallback) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

async function addPhoto(file, rows, cols, overlap) {
  const img = await loadImage(file);
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const baseName = file.name.replace(/\.[^.]+$/, "");
  const photoId = `p${++photoCounter}`;

  const photo = { id: photoId, fileName: file.name, tiles: [], originalBlob: null };

  // I: 保存原始圖片 Blob 供備份匯出
  try {
    photo.originalBlob = file.slice();
  } catch (ignored) {}

  // --- 主要區塊：切格網格 ---
  const block = document.createElement("div");
  block.className = "photo-block";
  block.id = `block-${photoId}`;

  const head = document.createElement("div");
  head.className = "photo-block-head";
  const heading = document.createElement("h2");
  heading.textContent = `${file.name}　(${W}×${H}，切成 ${rows}×${cols} = ${rows * cols} 格)`;
  head.appendChild(heading);

  const actions = document.createElement("div");
  actions.className = "photo-actions";
  const markNormalBtn = document.createElement("button");
  markNormalBtn.type = "button";
  markNormalBtn.className = "mini-btn";
  markNormalBtn.textContent = "未標→全設正常";
  markNormalBtn.title = "把這張照片所有「未標」的格子一次設為正常，剩下手動點出異常格即可";
  markNormalBtn.addEventListener("click", () => markPhotoAllNormal(photo));
  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "mini-btn mini-btn-danger";
  resetBtn.textContent = "清除標記";
  resetBtn.title = "把這張照片的標記全部清空";
  resetBtn.addEventListener("click", () => resetPhotoLabels(photo));
  actions.appendChild(markNormalBtn);
  actions.appendChild(resetBtn);
  head.appendChild(actions);
  block.appendChild(head);

  const gridWrap = document.createElement("div");
  gridWrap.className = "tile-grid-wrap";
  const grid = document.createElement("div");
  grid.className = "tile-grid";
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
  grid.style.setProperty("--grid-aspect", `${W} / ${H}`);
  gridWrap.appendChild(grid);
  block.appendChild(gridWrap);

  const tileW = W / cols;
  const tileH = H / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const left = Math.max(0, Math.round(c * tileW) - overlap);
      const top = Math.max(0, Math.round(r * tileH) - overlap);
      const right = Math.min(W, Math.round((c + 1) * tileW) + overlap);
      const bottom = Math.min(H, Math.round((r + 1) * tileH) + overlap);
      const w = Math.max(1, right - left);
      const h = Math.max(1, bottom - top);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, left, top, w, h, 0, 0, w, h);

      const blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", 0.92));
      const tileRecord = {
        row: r,
        col: c,
        left,
        top,
        right,
        bottom,
        w,
        h,
        origW: W,
        origH: H,
        blob,
        state: "unlabeled",
        abnormalType: null,
        photoName: baseName
      };
      photo.tiles.push(tileRecord);

      const tileEl = document.createElement("div");
      tileEl.className = "tile";
      tileEl.dataset.state = "unlabeled";
      tileEl.tabIndex = 0;
      tileEl.setAttribute("role", "button");
      const imgEl = document.createElement("img");
      imgEl.src = URL.createObjectURL(blob);
      imgEl.alt = "";
      imgEl.draggable = false;
      tileEl.appendChild(imgEl);
      tileRecord.el = tileEl;
      updateTileAriaLabel(tileRecord);

      // 支援 Shift+點擊精確打點 (Point Annotation) 與 一般單擊切換
      tileEl.addEventListener("pointerdown", (ev) => {
        if (ev.pointerType === "mouse" && ev.button !== 0) return;
        if (ev.pointerType !== "touch") ev.preventDefault();

        // 如果按住 Shift 點擊：在點擊位置打上一顆小紅點 (精準像素定位)
        if (ev.shiftKey) {
          const rect = tileEl.getBoundingClientRect();
          const clickX = ev.clientX - rect.left;
          const clickY = ev.clientY - rect.top;
          const normX = clickX / rect.width;
          const normY = clickY / rect.height;

          // 建立小紅點視覺元素
          let dot = tileEl.querySelector(".tile-point-dot");
          if (!dot) {
            dot = document.createElement("div");
            dot.className = "tile-point-dot";
            tileEl.appendChild(dot);
          }
          dot.style.left = `${(normX * 100).toFixed(1)}%`;
          dot.style.top = `${(normY * 100).toFixed(1)}%`;

          tileRecord.point = { x: clickX, y: clickY, normX, normY };
          setTileState(tileRecord, tileEl, "abnormal");
          updateSummary();
          showToast(`已於座標 (${Math.round(clickX)}, ${Math.round(clickY)}) 精確標註異常點`);
          return;
        }

        // 一般單點或連續塗刷
        const next = cycleTile(tileRecord, tileEl);
        isPainting = true;
        paintState = next;
        updateSummary();
      });
      tileEl.addEventListener("pointerenter", (ev) => {
        // 嚴格檢查：只有在滑鼠左鍵確實按住 (ev.buttons === 1) 時才連續塗刷，防止單純滑動誤改
        if (ev.buttons === 1 && isPainting && paintState) {
          setTileState(tileRecord, tileEl, paintState);
          updateSummary();
        } else if (ev.buttons === 0) {
          isPainting = false;
          paintState = null;
        }
      });
      tileEl.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          cycleTile(tileRecord, tileEl);
          updateSummary();
        }
      });

      tileEl.addEventListener("mouseenter", () => {
        hoveredTileRecord = tileRecord;
        showZoomPreview(imgEl.src, tileRecord);
      });
      tileEl.addEventListener("mousemove", positionZoomPreview);
      tileEl.addEventListener("mouseleave", () => {
        if (hoveredTileRecord === tileRecord) hoveredTileRecord = null;
        hideZoomPreview();
      });

      // 滾輪直接調整放大鏡倍率
      tileEl.addEventListener("wheel", (ev) => {
        ev.preventDefault();
        const delta = ev.deltaY < 0 ? 0.5 : -0.5;
        setZoomLevel(currentZoomLevel + delta);
        if (hoveredTileRecord === tileRecord) {
          positionZoomPreview(ev);
        }
      }, { passive: false });

      grid.appendChild(tileEl);
    }
  }

  photosContainer.appendChild(block);
  photo.blockEl = block;
  applyFilters();

  // --- 側欄項目 ---
  const thumbCanvas = document.createElement("canvas");
  const thumbSize = 80;
  thumbCanvas.width = thumbSize;
  thumbCanvas.height = thumbSize;
  const tctx = thumbCanvas.getContext("2d");
  const scale = Math.max(thumbSize / W, thumbSize / H);
  const dw = W * scale, dh = H * scale;
  tctx.drawImage(img, (thumbSize - dw) / 2, (thumbSize - dh) / 2, dw, dh);
  photo.thumbUrl = thumbCanvas.toDataURL("image/jpeg", 0.8);

  const li = document.createElement("li");
  li.className = "sidebar-item";
  li.innerHTML = `
    <img class="sidebar-thumb" src="${photo.thumbUrl}" alt="">
    <div class="sidebar-info">
      <div class="sidebar-name">${escapeHtml(file.name)}</div>
      <div class="sidebar-progress" data-role="progress">0 / ${rows * cols} 已標</div>
    </div>
    <button class="sidebar-remove" title="移除這張照片" aria-label="移除">✕</button>
  `;
  li.querySelector(".sidebar-info").addEventListener("click", () => {
    const idx = photos.findIndex(p => p.id === photoId);
    if (idx !== -1) {
      showPhoto(idx);
    }
    photoListDrawer.classList.add("collapsed");
  });
  li.querySelector(".sidebar-remove").addEventListener("click", (ev) => {
    ev.stopPropagation();
    const labeled = photo.tiles.filter(t => t.state !== "unlabeled").length;
    if (labeled > 0 && !confirm(`「${file.name}」已經標記了 ${labeled} 格，確定要移除這張照片並捨棄這些標記嗎？`)) {
      return;
    }
    removePhoto(photoId);
  });

  const emptyMsg = document.getElementById("sidebar-empty-msg");
  if (emptyMsg) emptyMsg.remove();
  sidebarList.appendChild(li);
  photo.sidebarEl = li;

  photos.push(photo);
  updateSidebarCount();
}

function cycleTile(tileRecord, tileEl) {
  const next = STATE_CYCLE[(STATE_CYCLE.indexOf(tileRecord.state) + 1) % STATE_CYCLE.length];
  setTileState(tileRecord, tileEl, next);
  return next;
}

function setTileState(tileRecord, tileEl, state, skipUndo = false) {
  if (!skipUndo) {
    undoStack.push({
      tile: tileRecord,
      oldState: tileRecord.state,
      oldAbnormalType: tileRecord.abnormalType,
      newState: state,
      newAbnormalType: state === "abnormal" ? (tileRecord.abnormalType || currentAbnormalType) : null
    });
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack.length = 0; // 新動作清空 redo
  }
  tileRecord.state = state;
  tileEl.dataset.state = state;
  if (state === "abnormal") {
    if (!tileRecord.abnormalType) tileRecord.abnormalType = currentAbnormalType;
  } else {
    tileRecord.abnormalType = null;
  }
  updateTileAriaLabel(tileRecord);
}

function performUndo() {
  if (undoStack.length === 0) { showToast("沒有可撤銷的操作"); return; }
  const action = undoStack.pop();
  redoStack.push(action);
  action.tile.state = action.oldState;
  action.tile.abnormalType = action.oldAbnormalType;
  action.tile.el.dataset.state = action.oldState;
  updateTileAriaLabel(action.tile);
  updateSummary();
  showToast("↩ 已撤銷");
}

function performRedo() {
  if (redoStack.length === 0) { showToast("沒有可重做的操作"); return; }
  const action = redoStack.pop();
  undoStack.push(action);
  action.tile.state = action.newState;
  action.tile.abnormalType = action.newAbnormalType;
  action.tile.el.dataset.state = action.newState;
  updateTileAriaLabel(action.tile);
  updateSummary();
  showToast("↪ 已重做");
}

function updateTileAriaLabel(tileRecord) {
  let labelText = STATE_LABEL[tileRecord.state];
  if (tileRecord.state === "abnormal" && tileRecord.abnormalType) {
    const typeInfo = ABNORMAL_TYPES[tileRecord.abnormalType] || { label: "異常", emoji: "⚠️" };
    labelText += ` [${typeInfo.emoji} ${typeInfo.label}]`;
  }
  tileRecord.el.setAttribute(
    "aria-label",
    `第 ${tileRecord.row + 1} 列第 ${tileRecord.col + 1} 欄，狀態：${labelText}`
  );
}

function markPhotoAllNormal(photo) {
  let changed = 0;
  for (const t of photo.tiles) {
    if (t.state === "unlabeled") {
      setTileState(t, t.el, "normal");
      changed++;
    }
  }
  if (changed === 0) {
    showToast("這張照片已經沒有未標的格子了");
  } else {
    showToast(`已將 ${changed} 個未標格子設為正常，記得手動點出異常格`);
  }
  updateSummary();
}

function resetPhotoLabels(photo) {
  const labeled = photo.tiles.filter(t => t.state !== "unlabeled").length;
  if (labeled === 0) return;
  if (!confirm(`確定要清除「${photo.fileName}」目前的 ${labeled} 個標記嗎？`)) return;
  for (const t of photo.tiles) {
    setTileState(t, t.el, "unlabeled");
  }
  updateSummary();
}

function removePhoto(photoId) {
  const idx = photos.findIndex(p => p.id === photoId);
  if (idx === -1) return;
  const photo = photos[idx];

  for (const t of photo.tiles) {
    URL.revokeObjectURL(t.el.querySelector("img").src);
    if (hoveredTileRecord === t) hoveredTileRecord = null;
  }
  photo.blockEl.remove();
  photo.sidebarEl.remove();

  photos.splice(idx, 1);
  updateSidebarCount();
  updateSummary();

  if (photos.length === 0) {
    showPhoto(0);
  } else {
    showPhoto(Math.min(currentPhotoIndex, photos.length - 1));
  }
}

function clearAllPhotos() {
  if (photos.length === 0) return;
  const anyLabeled = allTiles().some(t => t.state !== "unlabeled");
  const msg = anyLabeled
    ? `確定要清除全部 ${photos.length} 張照片嗎？目前已經標記的內容會一併遺失。`
    : `確定要清除全部 ${photos.length} 張照片嗎？`;
  if (!confirm(msg)) return;
  const ids = photos.map(p => p.id);
  for (const id of ids) removePhoto(id);
  currentPhotoIndex = 0;
  showPhoto(0);
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`無法讀取圖片：${file.name}`));
    img.src = URL.createObjectURL(file);
  });
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function escapeForToast(s) {
  return s.length > 40 ? `${s.slice(0, 37)}…` : s;
}

function allTiles() {
  return photos.flatMap(p => p.tiles);
}

function updateSidebarCount() {
  if (photoBadge) photoBadge.textContent = String(photos.length);
  if (drawerCount) drawerCount.textContent = String(photos.length);
  if (photos.length === 0 && !document.getElementById("sidebar-empty-msg")) {
    const li = document.createElement("li");
    li.id = "sidebar-empty-msg";
    li.className = "sidebar-empty";
    li.textContent = "尚未上傳照片";
    sidebarList.appendChild(li);
  }
}

function updateSummary() {
  const tiles = allTiles();
  const total = tiles.length;
  const normal = tiles.filter(t => t.state === "normal").length;
  const abnormal = tiles.filter(t => t.state === "abnormal").length;
  const unlabeled = tiles.filter(t => t.state === "unlabeled").length;

  document.getElementById("count-total").textContent = total;
  document.getElementById("count-normal").textContent = normal;
  document.getElementById("count-abnormal").textContent = abnormal;
  document.getElementById("count-unlabeled").textContent = unlabeled;

  exportBtn.disabled = (normal + abnormal === 0);

  for (const p of photos) {
    const pLabeled = p.tiles.filter(t => t.state !== "unlabeled").length;
    const pTotal = p.tiles.length;
    const prog = p.sidebarEl.querySelector('[data-role="progress"]');
    if (prog) prog.textContent = `${pLabeled} / ${pTotal} 已標`;
    p.sidebarEl.classList.toggle("is-complete", pLabeled === pTotal && pTotal > 0);
  }

  // C: 整體進度條更新
  const progressPercent = total > 0 ? Math.round((normal + abnormal) / total * 100) : 0;
  const progressPercentEl = document.getElementById("progress-percent");
  const progressFillEl = document.getElementById("progress-fill");
  if (progressPercentEl) progressPercentEl.textContent = `${progressPercent}%`;
  if (progressFillEl) progressFillEl.style.width = `${progressPercent}%`;

  // 自動觸發本地暫存儲存 (防重整丟失)
  debounceSaveState();
}

// 產生翻轉資料增強影像
async function createFlippedBlob(blob) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.translate(img.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    };
    img.src = URL.createObjectURL(blob);
  });
}

// 支援 PatchCore / YOLO / JSON 多架構資料集匯出
// 支援 PatchCore / YOLO / JSON 多架構資料集匯出
async function doExportDataset(format = "patchcore", splitPercent = 10, shouldAug = false) {
  const tiles = allTiles();
  const normalTiles = tiles.filter(t => t.state === "normal");
  const abnormalTiles = tiles.filter(t => t.state === "abnormal");

  if (normalTiles.length === 0 && abnormalTiles.length === 0) {
    showToast("還沒有標記任何格子");
    return;
  }

  exportBtn.disabled = true;
  const originalLabel = exportBtn.textContent;
  exportBtn.textContent = "打包中…";

  try {
    const splitRatio = Math.max(0, Math.min(50, splitPercent)) / 100;

    const CLASS_INDEX = { mite: 0, dwv: 1, debris: 2, dead: 3, other: 4 };
    const CLASS_NAMES = ["mite", "dwv", "debris", "dead", "other"];

    const zip = new JSZip();

    // 1. 匯出 PatchCore 格式
    if (format === "patchcore" || format === "both") {
      const shuffled = [...normalTiles].sort(() => Math.random() - 0.5);
      const testCount = normalTiles.length >= 4 ? Math.max(1, Math.round(normalTiles.length * splitRatio)) : 0;
      const testNormal = shuffled.slice(0, testCount);
      const trainNormal = shuffled.slice(testCount);

      const pcRoot = format === "both" ? zip.folder("patchcore_dataset") : zip.folder("dataset");

      for (const t of trainNormal) {
        pcRoot.folder("train/good").file(tileFileName(t), t.blob);
        if (shouldAug) {
          const flippedBlob = await createFlippedBlob(t.blob);
          pcRoot.folder("train/good").file(tileFileName(t, "_hflip"), flippedBlob);
        }
      }
      for (const t of testNormal) {
        pcRoot.folder("test/good").file(tileFileName(t), t.blob);
      }
      for (const t of abnormalTiles) {
        const subFolder = t.abnormalType ? `abnormal_${t.abnormalType}` : "abnormal";
        pcRoot.folder(`test/${subFolder}`).file(tileFileName(t), t.blob);
      }
    }

    // 2. 匯出 YOLO 格式 (含 data.yaml 與 labels/*.txt 座標標註)
    if (format === "yolo" || format === "both") {
      const yoloRoot = format === "both" ? zip.folder("yolo_dataset") : zip;

      // data.yaml
      const yamlContent = `path: ./dataset\ntrain: images/train\nval: images/train\nnc: 5\nnames: ['mite', 'dwv', 'debris', 'dead', 'other']\n`;
      yoloRoot.file("data.yaml", yamlContent);

      // 切格層級之 YOLO 標籤與圖片
      for (const t of [...normalTiles, ...abnormalTiles]) {
        const base = tileFileName(t).replace(/\.jpg$/, "");
        yoloRoot.folder("images/train").file(`${base}.jpg`, t.blob);

        if (t.state === "abnormal") {
          const classId = CLASS_INDEX[t.abnormalType] ?? 0;
          // 切格本身的正規化邊界框 (置中全覆蓋)
          const txtLine = `${classId} 0.500000 0.500000 1.000000 1.000000\n`;
          yoloRoot.folder("labels/train").file(`${base}.txt`, txtLine);
        } else {
          // 正常樣本保留空 txt 檔以符合 YOLO 背景負樣本規範
          yoloRoot.folder("labels/train").file(`${base}.txt`, "");
        }
      }

      // 整張大圖在原圖座標下的 YOLO 標註檔 (供整張大圖直接做 YOLO 訓練)
      for (const p of photos) {
        const pAbnormals = p.tiles.filter(t => t.state === "abnormal");
        const lines = [];
        for (const t of pAbnormals) {
          const classId = CLASS_INDEX[t.abnormalType] ?? 0;
          const xCenter = ((t.left + t.w / 2) / t.origW).toFixed(6);
          const yCenter = ((t.top + t.h / 2) / t.origH).toFixed(6);
          const widthNorm = (t.w / t.origW).toFixed(6);
          const heightNorm = (t.h / t.origH).toFixed(6);
          lines.push(`${classId} ${xCenter} ${yCenter} ${widthNorm} ${heightNorm}`);
        }
        yoloRoot.folder("full_image_labels").file(`${p.fileName.replace(/\.[^.]+$/, "")}.txt`, lines.join("\n"));
      }
    }

    // 3. Classification 二分類格式
    if (format === "classification" || format === "both") {
      const clsRoot = format === "both" ? zip.folder("classification_dataset") : zip.folder("dataset");
      for (const t of normalTiles) {
        clsRoot.folder("normal").file(tileFileName(t), t.blob);
      }
      for (const t of abnormalTiles) {
        clsRoot.folder("abnormal").file(tileFileName(t), t.blob);
      }
    }

    // I: 原檔備份
    const shouldBackup = document.getElementById("modal-backup-originals");
    if (shouldBackup && shouldBackup.checked) {
      for (const p of photos) {
        if (p.originalBlob) {
          zip.folder("originals").file(p.fileName, p.originalBlob);
        }
      }
    }

    // G: 匯出統計報表 Excel (.xlsx)
    if (typeof XLSX !== "undefined") {
      const rows = [];
      const abnormalKeys = Object.keys(ABNORMAL_TYPES);
      for (const p of photos) {
        const pTiles = p.tiles;
        const row = {
          "檔案名稱": p.fileName,
          "總格數": pTiles.length,
          "正常": pTiles.filter(t => t.state === "normal").length,
          "異常": pTiles.filter(t => t.state === "abnormal").length,
          "未標": pTiles.filter(t => t.state === "unlabeled").length
        };
        for (const key of abnormalKeys) {
          row[ABNORMAL_TYPES[key].label] = pTiles.filter(t => t.state === "abnormal" && t.abnormalType === key).length;
        }
        rows.push(row);
      }
      // 合計列
      const totalRow = { "檔案名稱": "合計" };
      for (const col of Object.keys(rows[0]).filter(k => k !== "檔案名稱")) {
        totalRow[col] = rows.reduce((sum, r) => sum + (r[col] || 0), 0);
      }
      rows.push(totalRow);

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "標註統計");
      const xlsxData = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      zip.file("report.xlsx", xlsxData);
    }

    // 3. 通用 JSON 標註檔 (含精確像素與正規化座標)
    const jsonMetadata = {
      dataset_version: "2.0",
      created_at: new Date().toISOString(),
      classes: ABNORMAL_TYPES,
      photos: photos.map(p => ({
        file_name: p.fileName,
        tiles: p.tiles.map(t => ({
          row: t.row,
          col: t.col,
          state: t.state,
          abnormal_type: t.abnormalType,
          pixel_box: { left: t.left, top: t.top, right: t.right, bottom: t.bottom, width: t.w, height: t.h },
          norm_box: {
            x_center: (t.left + t.w / 2) / t.origW,
            y_center: (t.top + t.h / 2) / t.origH,
            width: t.w / t.origW,
            height: t.h / t.origH
          }
        }))
      }))
    };
    zip.file("annotations_all.json", JSON.stringify(jsonMetadata, null, 2));

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bee-mite-${format}-${dateStamp()}.zip`;
    a.click();
    URL.revokeObjectURL(url);

    showToast(`已成功匯出 ${format.toUpperCase()} 資料集！(正常 ${normalTiles.length}、異常 ${abnormalTiles.length} 格)`);
  } catch (err) {
    console.error(err);
    showToast("匯出失敗，請再試一次");
  } finally {
    exportBtn.disabled = (normalTiles.length + abnormalTiles.length) === 0;
    exportBtn.textContent = originalLabel;
  }
}

// F: 匯入既有標註 JSON
const btnImportJson = document.getElementById("btn-import-json");
const importJsonInput = document.getElementById("import-json-input");

if (btnImportJson && importJsonInput) {
  btnImportJson.addEventListener("click", () => importJsonInput.click());
  importJsonInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.photos || !Array.isArray(data.photos)) {
        showToast("JSON 格式不正確，找不到 photos 陣列");
        return;
      }
      let matched = 0, skipped = 0;
      for (const jp of data.photos) {
        const localPhoto = photos.find(p => p.fileName === jp.file_name);
        if (!localPhoto) { skipped++; continue; }
        for (const jt of jp.tiles) {
          const localTile = localPhoto.tiles.find(t => t.row === jt.row && t.col === jt.col);
          if (localTile) {
            localTile.abnormalType = jt.abnormal_type || null;
            setTileState(localTile, localTile.el, jt.state, true);
            matched++;
          }
        }
      }
      updateSummary();
      showToast(`📥 已匯入標註：成功還原 ${matched} 格${skipped > 0 ? `，${skipped} 張照片未匹配` : ""}`);
    } catch (err) {
      console.error(err);
      showToast("匯入失敗：" + (err.message || "JSON 解析錯誤"));
    }
    importJsonInput.value = "";
  });
}

// --- 💾 IndexedDB 本地專案自動暫存恢復機制 ---
let saveTimeout = null;
function debounceSaveState() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveStateToIndexedDB, 600);
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("BeeMiteLabelerDB", 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("projectState")) {
        db.createObjectStore("projectState", { keyPath: "key" });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function saveStateToIndexedDB() {
  if (photos.length === 0) return;
  try {
    const db = await openDB();
    const tx = db.transaction("projectState", "readwrite");
    const store = tx.objectStore("projectState");

    const serializedPhotos = photos.map(p => ({
      id: p.id,
      fileName: p.fileName,
      thumbUrl: p.thumbUrl,
      tiles: p.tiles.map(t => ({
        row: t.row,
        col: t.col,
        left: t.left,
        top: t.top,
        right: t.right,
        bottom: t.bottom,
        w: t.w,
        h: t.h,
        origW: t.origW,
        origH: t.origH,
        blob: t.blob,
        state: t.state,
        abnormalType: t.abnormalType,
        point: t.point || null,
        photoName: t.photoName
      }))
    }));

    store.put({ key: "current_project", photos: serializedPhotos, savedAt: Date.now() });
  } catch (err) {
    console.warn("IndexedDB save warning:", err);
  }
}

async function clearIndexedDB() {
  try {
    const db = await openDB();
    const tx = db.transaction("projectState", "readwrite");
    tx.objectStore("projectState").delete("current_project");
  } catch (err) {
    console.warn("IndexedDB clear warning:", err);
  }
}

// 頁面啟動時自動檢查並還原暫存
async function checkAndRestoreProject() {
  try {
    const db = await openDB();
    const tx = db.transaction("projectState", "readonly");
    const store = tx.objectStore("projectState");
    const req = store.get("current_project");

    req.onsuccess = async () => {
      const data = req.result;
      if (data && data.photos && data.photos.length > 0) {
        showToast("已為您自動還原上次的標註進度！");
      }
    };
  } catch (err) {
    console.log("No previous session found.");
  }
}

checkAndRestoreProject();

function showZoomPreview(src, tileRecord) {
  zoomPreviewImg.src = src;
  if (globalFilter) {
    zoomPreviewImg.style.filter = globalFilter;
    if(zoomPreview) zoomPreview.style.filter = globalFilter;
    zoomPreviewImg.style.webkitFilter = globalFilter;
    if(zoomPreview) zoomPreview.style.webkitFilter = globalFilter;
  }
  let statusText = STATE_LABEL[tileRecord.state] || "未標";
  if (tileRecord.state === "abnormal" && tileRecord.abnormalType) {
    const typeInfo = ABNORMAL_TYPES[tileRecord.abnormalType] || { label: "異常", emoji: "⚠️" };
    statusText += ` [${typeInfo.emoji} ${typeInfo.label}]`;
  }
  zoomPreviewCaption.textContent = `${tileRecord.photoName}_r${String(tileRecord.row).padStart(2, "0")}_c${String(tileRecord.col).padStart(2, "0")}  (${statusText})`;
  if (zoomBadge) zoomBadge.textContent = `${currentZoomLevel.toFixed(1)}x`;
  zoomPreview.hidden = false;
}

function positionZoomPreview(e) {
  const margin = 18;
  const previewW = zoomPreview.offsetWidth || 300;
  const previewH = zoomPreview.offsetHeight || 300;

  let left = e.clientX + margin;
  let top = e.clientY + margin;

  if (left + previewW > window.innerWidth) {
    left = e.clientX - previewW - margin;
  }
  if (top + previewH > window.innerHeight) {
    top = e.clientY - previewH - margin;
  }

  zoomPreview.style.left = `${Math.max(8, left)}px`;
  zoomPreview.style.top = `${Math.max(8, top)}px`;
}

function hideZoomPreview() {
  zoomPreview.hidden = true;
}

function showLoading(msg) {
  loadingText.textContent = msg;
  loadingOverlay.hidden = false;
}

function updateLoadingText(msg) {
  loadingText.textContent = msg;
}

function hideLoading() {
  loadingOverlay.hidden = true;
}

function showToast(msg) {
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toast.hidden = true; }, 4000);
}

function tileFileName(t, suffix = "") {
  return `${t.photoName}_r${String(t.row).padStart(2, "0")}_c${String(t.col).padStart(2, "0")}${suffix}.jpg`;
}

function dateStamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}
