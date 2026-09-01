// 相關狀態與業務邏輯
// 相關狀態與業務邏輯
// 相關狀態與業務邏輯

const STATE_CYCLE = ["unlabeled", "normal", "abnormal"];
const STATE_LABEL = { unlabeled: "未標記", normal: "正常", abnormal: "異常" };

// 異常標記類別
const ABNORMAL_TYPES = {
  mite: { label: "蜂蟹蟎成蟲/幼蟲", emoji: "🕷️", code: "mite" },
  dwv: { label: "殘翅/發育不良(DWV)", emoji: "🐝", code: "dwv" },
  debris: { label: "異物/蠟屑", emoji: "🗑️", code: "debris" },
  dead: { label: "死蜂/發黑蜂蛹", emoji: "💀", code: "dead" },
  other: { label: "其他未定義異常", emoji: "❓", code: "other" }
};

let currentAbnormalType = "mite";
let currentZoomLevel = 3.0; // 預設放大倍率
let globalFilter = ""; // 全域影像濾鏡設定
let zoomLocked = false; // 放大鏡鎖定狀態

// 相關狀態與業務邏輯
// 相關狀態與業務邏輯
// 相關狀態與業務邏輯
const DEFAULT_POINT_BOX_PX = 20;
let currentPointBoxPx = DEFAULT_POINT_BOX_PX;

// 相關狀態與業務邏輯
const DRAG_THRESHOLD_PX = 6;

// 相關狀態與業務邏輯
// 相關狀態與業務邏輯
// 相關狀態與業務邏輯
function pointBoxDims(point) {
  if (!point) return { w: DEFAULT_POINT_BOX_PX, h: DEFAULT_POINT_BOX_PX };
  const w = point.widthPx || point.boxPx || DEFAULT_POINT_BOX_PX;
  const h = point.heightPx || point.boxPx || DEFAULT_POINT_BOX_PX;
  return { w, h };
}

// 相關狀態與業務邏輯
const undoStack = [];
const redoStack = [];
const MAX_UNDO = 200;

// 相關狀態與業務邏輯
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

// 相關狀態與業務邏輯
let isPainting = false;
let paintState = null;
// 相關狀態與業務邏輯
let hoveredTileRecord = null;
// 相關狀態與業務邏輯
// 相關狀態與業務邏輯

// 相關狀態與業務邏輯
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
const zoomPreviewImgWrap = document.getElementById("zoom-preview-img-wrap");
const zoomPreviewImg = document.getElementById("zoom-preview-img");
const zoomPreviewCaption = document.getElementById("zoom-preview-caption");
const zoomBadge = document.getElementById("zoom-badge");
const zoomShiftHint = document.getElementById("zoom-shift-hint");

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

// 相關狀態與業務邏輯
const exportModal = document.getElementById("export-modal");
const modalCloseBtn = document.getElementById("modal-close-btn");
const modalCancelBtn = document.getElementById("modal-cancel-btn");
const modalConfirmExportBtn = document.getElementById("modal-confirm-export-btn");
const modalTestSplit = document.getElementById("modal-test-split");
const modalAugFlip = document.getElementById("modal-aug-flip");

// 相關狀態與業務邏輯
const healthCheckModal = document.getElementById("health-check-modal");
const healthCloseBtn = document.getElementById("health-close-btn");
const healthCancelBtn = document.getElementById("health-cancel-btn");
const healthConfirmBtn = document.getElementById("health-confirm-btn");
const healthStatList = document.getElementById("health-stat-list");
const healthWarnList = document.getElementById("health-warn-list");
// 相關狀態與業務邏輯
let pendingExportAction = null;

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

// 相關狀態與業務邏輯
const filterBrightness = document.getElementById("filter-brightness");
const filterContrast = document.getElementById("filter-contrast");
const btnResetFilters = document.getElementById("btn-reset-filters");
const btnSharpen = document.getElementById("btn-sharpen");
const btnClahe = document.getElementById("btn-clahe");
const btnAiPredict = document.getElementById("btn-ai-predict");
const btnClearDb = document.getElementById("btn-clear-db");
const zoomLevelSelect = document.getElementById("zoom-level-select");
const pointBoxSelect = document.getElementById("point-box-select");
const zoomLevelBtns = document.querySelectorAll(".zoom-level-btn");
const pointBoxBtns = document.querySelectorAll(".point-box-btn");

// 相關狀態與業務邏輯
photoInput.addEventListener("change", handleFiles);
exportBtn.addEventListener("click", openExportModal);

if (btnClearDb) {
  btnClearDb.addEventListener("click", () => {
    if (confirm("確定要清空所有本地快取並重置專案嗎？")) {
      clearIndexedDB();
      clearAllPhotos();
      showToast("已清空本地快取並重置");
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

// 相關狀態與業務邏輯
// 相關狀態與業務邏輯

// 相關狀態與業務邏輯
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

// 相關狀態與業務邏輯
function openExportModal() {
  const tiles = allTiles();
  const normalTiles = tiles.filter(t => t.state === "normal");
  const abnormalTiles = tiles.filter(t => t.state === "abnormal");
  if (normalTiles.length === 0 && abnormalTiles.length === 0) {
    showToast("已還原標註進度");
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
    // 相關狀態與業務邏輯
    openHealthCheckModal(() => doExportDataset(format, splitPercent, shouldAug));
  });
}

// 相關狀態與業務邏輯
// 相關狀態與業務邏輯
const MIN_HEALTHY_SAMPLES = 10;

function computeDatasetHealth() {
  const tiles = allTiles();
  const normal = tiles.filter(t => t.state === "normal").length;
  const abnormal = tiles.filter(t => t.state === "abnormal").length;
  const abnormalKeys = Object.keys(ABNORMAL_TYPES);
  const byClass = {};
  for (const key of abnormalKeys) {
    byClass[key] = tiles.filter(t => t.state === "abnormal" && t.abnormalType === key).length;
  }

  const warnings = [];
  for (const key of abnormalKeys) {
    const n = byClass[key];
    if (n > 0 && n < MIN_HEALTHY_SAMPLES) {
      const info = ABNORMAL_TYPES[key];
      warnings.push(`目錄完全沒有正常樣本，PatchCore 演算法無法訓練，請至少標記一些正常樣本！`);
    }
  }
  if (normal > 0 && normal < MIN_HEALTHY_SAMPLES) {
    warnings.push(`目錄完全沒有正常樣本，PatchCore 演算法無法訓練，請至少標記一些正常樣本！`);
  }
  if (normal === 0 && abnormal > 0) {
    warnings.push(`目錄完全沒有正常樣本，PatchCore 演算法無法訓練，請至少標記一些正常樣本！`);
  }

  return { normal, abnormal, byClass, warnings };
}

function renderHealthCheckModal(stats) {
  if (healthStatList) {
    const rows = [];
    rows.push(`<div class="health-stat-row"><span>✅ 正常</span><span class="health-stat-num">${stats.normal} 張</span></div>`);
    rows.push(`<div class="health-stat-row"><span>⚠️ 異常合計</span><span class="health-stat-num">${stats.abnormal} 張</span></div>`);

    let ratioText;
    if (stats.abnormal > 0 && stats.normal > 0) {
      ratioText = "全為異常樣本";
    } else if (stats.normal > 0) {
      ratioText = "全為異常樣本";
    } else if (stats.abnormal > 0) {
      ratioText = "全為正常樣本";
    } else {
      ratioText = "無資料";
    }
    rows.push(`<div class="health-stat-row"><span>📊 正常/異常比例</span><span class="health-stat-num">${ratioText}</span></div>`);

    for (const key of Object.keys(ABNORMAL_TYPES)) {
      const info = ABNORMAL_TYPES[key];
      const n = stats.byClass[key];
      const isLow = n > 0 && n < MIN_HEALTHY_SAMPLES;
      rows.push(`<div class="health-stat-row${isLow ? " is-warn" : ""}"><span>${info.emoji} ${info.label}</span><span class="health-stat-num">${n} 張${isLow ? " ⚠️" : ""}</span></div>`);
    }
    healthStatList.innerHTML = rows.join("");
  }

  if (healthWarnList) {
    if (stats.warnings.length === 0) {
      healthWarnList.innerHTML = `<div class="health-ok-banner">✅ 各類別樣本數量充足，可以匯出！</div>`;
    } else {
      healthWarnList.innerHTML = stats.warnings.map(w => `<div class="health-warn-item">⚠️ ${w}</div>`).join("");
    }
  }
}

function openHealthCheckModal(onConfirm) {
  const stats = computeDatasetHealth();
  renderHealthCheckModal(stats);
  pendingExportAction = onConfirm;
  if (healthCheckModal) healthCheckModal.hidden = false;
}

function closeHealthCheckModal() {
  if (healthCheckModal) healthCheckModal.hidden = true;
  pendingExportAction = null;
}

if (healthCloseBtn) healthCloseBtn.addEventListener("click", closeHealthCheckModal);
if (healthCancelBtn) healthCancelBtn.addEventListener("click", closeHealthCheckModal);
if (healthCheckModal) {
  healthCheckModal.addEventListener("click", (e) => {
    if (e.target === healthCheckModal) closeHealthCheckModal();
  });
}
if (healthConfirmBtn) {
  healthConfirmBtn.addEventListener("click", () => {
    const action = pendingExportAction;
    if (healthCheckModal) healthCheckModal.hidden = true;
    pendingExportAction = null;
    if (action) action();
  });
}

// 相關狀態與業務邏輯
if (zoomLevelSelect) {
  zoomLevelSelect.addEventListener("change", () => {
    const level = parseFloat(zoomLevelSelect.value) || 3.0;
    setZoomLevel(level);
  });
}

zoomLevelBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const level = parseFloat(btn.dataset.zoom) || 3.0;
    setZoomLevel(level);
  });
});

function setZoomLevel(level) {
  currentZoomLevel = Math.max(1.5, Math.min(8.0, level));
  
  if (zoomLevelSelect) {
    // Find matching option or closest option
    let closestVal = null;
    let minDiff = Infinity;
    for (const opt of zoomLevelSelect.options) {
      const optVal = parseFloat(opt.value);
      const diff = Math.abs(optVal - currentZoomLevel);
      if (diff < minDiff) {
        minDiff = diff;
        closestVal = opt.value;
      }
    }
    if (closestVal !== null) {
      zoomLevelSelect.value = closestVal;
    }
  }

  zoomLevelBtns.forEach(b => {
    b.classList.toggle("is-active", Math.abs(parseFloat(b.dataset.zoom) - currentZoomLevel) < 0.1);
  });
  if (zoomBadge) zoomBadge.textContent = `${currentZoomLevel.toFixed(1)}x`;
  if (zoomPreview) {
    zoomPreview.style.width = `${Math.round(100 * currentZoomLevel + 20)}px`;
  }
  if (hoveredTileRecord && !zoomPreview.hidden) {
    const img = hoveredTileRecord.el ? hoveredTileRecord.el.querySelector("img") : null;
    if (img) showZoomPreview(img.src, hoveredTileRecord);
  }
}

if (pointBoxSelect) {
  pointBoxSelect.addEventListener("change", () => {
    const px = parseFloat(pointBoxSelect.value) || DEFAULT_POINT_BOX_PX;
    setPointBoxPx(px);
  });
}

pointBoxBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const px = parseFloat(btn.dataset.box) || DEFAULT_POINT_BOX_PX;
    setPointBoxPx(px);
  });
});

function setPointBoxPx(px) {
  currentPointBoxPx = Math.max(4, Math.min(200, px));
  
  if (pointBoxSelect) {
    let closestVal = null;
    let minDiff = Infinity;
    for (const opt of pointBoxSelect.options) {
      const optVal = parseFloat(opt.value);
      const diff = Math.abs(optVal - currentPointBoxPx);
      if (diff < minDiff) {
        minDiff = diff;
        closestVal = opt.value;
      }
    }
    if (closestVal !== null) {
      pointBoxSelect.value = closestVal;
    }
  }

  pointBoxBtns.forEach(b => {
    b.classList.toggle("is-active", Math.abs(parseFloat(b.dataset.box) - currentPointBoxPx) < 0.1);
  });
  
  if (hoveredTileRecord && !zoomPreview.hidden) {
    renderZoomPointMarker(hoveredTileRecord);
  }
}

prevPhotoBtn.addEventListener("click", () => {
  if (currentPhotoIndex > 0) showPhoto(currentPhotoIndex - 1);
});
nextPhotoBtn.addEventListener("click", () => {
  if (currentPhotoIndex < photos.length - 1) showPhoto(currentPhotoIndex + 1);
});
sidebarClearAll.addEventListener("click", clearAllPhotos);

// 相關狀態與業務邏輯
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

  // 相關狀態與業務邏輯
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

  // 相關狀態與業務邏輯
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
    showToast("已重設影像濾鏡與亮度");
  });
}

if (btnSharpen) {
  btnSharpen.addEventListener("click", () => {
    btnSharpen.classList.toggle("is-active");
    if (photosContainer) photosContainer.classList.toggle("is-sharpen", btnSharpen.classList.contains("is-active"));
    applyFilters();
    showToast(btnSharpen.classList.contains("is-active") ? "已開啟銳化" : "已關閉銳化");
  });
}

if (btnClahe) {
  btnClahe.addEventListener("click", () => {
    btnClahe.classList.toggle("is-active");
    if (photosContainer) photosContainer.classList.toggle("is-clahe", btnClahe.classList.contains("is-active"));
    applyFilters();
    showToast(btnClahe.classList.contains("is-active") ? "已開啟對比增強 (CLAHE)" : "已關閉對比增強");
  });
}

// 相關狀態與業務邏輯
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

  showLoading(`正在呼叫 API 進行推論 (${currentPhoto.fileName})...`);

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
      throw new Error(`無法連線至 ${endpoint}，請檢查是否已開啟 Tailscale！`);
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`伺服器回傳異常代碼: ${response.status}`);
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

    showToast(`AI 推論完成，共發現 ${abnormalCount} 個異常標記，其餘設為正常`);
    updateSummary();

  } catch (err) {
    console.warn("AI Prediction notice:", err);
    showToast(err.message || "推論失敗，請檢查 API 設定");
  } finally {
    hideLoading();
  }
}

showPhoto(0);

// 相關狀態與業務邏輯
document.addEventListener("pointerup", stopPainting);
document.addEventListener("pointercancel", stopPainting);
window.addEventListener("blur", stopPainting);
document.addEventListener("pointermove", (ev) => {
  if (ev.buttons === 0 && isPainting) {
    stopPainting();
  }
});

// 相關狀態與業務邏輯
const KEY_TO_ABNORMAL_TYPE = {
  q: "mite", Q: "mite",
  w: "dwv", W: "dwv",
  e: "debris", E: "debris",
  r: "dead", R: "dead",
  t: "other", T: "other"
};

// 相關狀態與業務邏輯
// 相關狀態與業務邏輯
// 相關狀態與業務邏輯
// 相關狀態與業務邏輯
// 相關狀態與業務邏輯
// 相關狀態與業務邏輯
// 相關狀態與業務邏輯
document.addEventListener("keydown", (e) => {
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

  // 相關狀態與業務邏輯
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

  // 相關狀態與業務邏輯
  if (e.key === "f" || e.key === "F") {
    if (!e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      keyboardNavActive = !keyboardNavActive;
      if (keyboardNavActive) {
        const cp = photos[currentPhotoIndex];
        if (cp && cp.tiles && cp.tiles.length > 0) {
          focusedTileIndex = 0;
          updateTileFocus(cp);
          hoveredTileRecord = cp.tiles[0];
          if (hoveredTileRecord && hoveredTileRecord.el) {
            const img = hoveredTileRecord.el.querySelector("img");
            if (img) showZoomPreview(img.src, hoveredTileRecord);
          }
          showToast("快捷鍵導覽已啟動 (可使用方向鍵移動，1/2/0 標記)");
        }
      } else {
        clearTileFocus();
        focusedTileIndex = -1;
        hoveredTileRecord = null;
        hideZoomPreview();
        showToast("快捷鍵導覽已關閉");
      }
      return;
    }
  }

  // 鍵盤導覽方向鍵移動
  if (keyboardNavActive && photos[currentPhotoIndex]) {
    const cp = photos[currentPhotoIndex];
    const totalTiles = (cp && cp.tiles) ? cp.tiles.length : 0;
    if (totalTiles > 0) {
      let cols = 8;
      const maxCol = Math.max(...cp.tiles.map(t => t.col || 0));
      if (isFinite(maxCol) && maxCol >= 0) {
        cols = maxCol + 1;
      }

      let curIdx = (focusedTileIndex >= 0 && focusedTileIndex < totalTiles) ? focusedTileIndex : 0;
      let newIdx = curIdx;
      if (e.key === "ArrowRight") { newIdx = Math.min(totalTiles - 1, curIdx + 1); }
      else if (e.key === "ArrowLeft") { newIdx = Math.max(0, curIdx - 1); }
      else if (e.key === "ArrowDown") { newIdx = Math.min(totalTiles - 1, curIdx + cols); }
      else if (e.key === "ArrowUp") { newIdx = Math.max(0, curIdx - cols); }

      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        focusedTileIndex = newIdx;
        updateTileFocus(cp);
        const focusedTile = cp.tiles[focusedTileIndex];
        if (focusedTile && focusedTile.el) {
          hoveredTileRecord = focusedTile;
          const img = focusedTile.el.querySelector("img");
          if (img) {
            showZoomPreview(img.src, focusedTile);
          }
        }
        return;
      }
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

  // 相關狀態與業務邏輯
  const matchedType = KEY_TO_ABNORMAL_TYPE[e.key];

  if (hoveredTileRecord && hoveredTileRecord.el) {
    if (matchedType) {
      e.preventDefault();
      selectAbnormalType(matchedType);
      hoveredTileRecord.abnormalType = matchedType;
      setTileState(hoveredTileRecord, hoveredTileRecord.el, "abnormal");
      updateSummary();
      const img = hoveredTileRecord.el.querySelector("img");
      if (img) showZoomPreview(img.src, hoveredTileRecord);
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
      const img = hoveredTileRecord.el.querySelector("img");
      if (img) showZoomPreview(img.src, hoveredTileRecord);
      return;
    }
  } else if (matchedType) {
    // 相關狀態與業務邏輯
    e.preventDefault();
    selectAbnormalType(matchedType);
  }
});

// 相關狀態與業務邏輯
window.addEventListener("beforeunload", (e) => {
  if (!allTiles().some(t => t.state !== "unlabeled")) return;
  e.preventDefault();
  e.returnValue = "";
});

function stopPainting() {
  isPainting = false;
  paintState = null;
}

// 相關狀態與業務邏輯
function updateTileFocus(photo) {
  clearTileFocus();
  if (focusedTileIndex >= 0 && photo && photo.tiles && focusedTileIndex < photo.tiles.length) {
    const tile = photo.tiles[focusedTileIndex];
    if (tile && tile.el) {
      tile.el.classList.add("tile-focused");
      tile.el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      positionZoomPreviewForTile(tile);
    }
  }
}

function clearTileFocus() {
  document.querySelectorAll(".tile-focused").forEach(el => el.classList.remove("tile-focused"));
}

function positionZoomPreviewForTile(tileRecord) {
  if (!tileRecord || !tileRecord.el || !zoomPreview) return;
  const rect = tileRecord.el.getBoundingClientRect();
  const margin = 18;
  const previewW = zoomPreview.offsetWidth || 300;
  const previewH = zoomPreview.offsetHeight || 300;

  let left = rect.right + margin;
  let top = rect.top;

  if (left + previewW > window.innerWidth) {
    left = rect.left - previewW - margin;
  }
  if (top + previewH > window.innerHeight) {
    top = window.innerHeight - previewH - margin;
  }

  zoomPreview.style.left = `${Math.max(8, left)}px`;
  zoomPreview.style.top = `${Math.max(8, top)}px`;
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
  showLoading(`正在處理照片 (0/${files.length})`);

  try {
    for (let i = 0; i < files.length; i++) {
      updateLoadingText(`正在處理 (${i + 1}/${files.length}): ${escapeForToast(files[i].name)}`);
      await nextFrame(); // 等待畫面渲染完成
      try {
        await addPhoto(files[i], rows, cols, overlap);
      } catch (err) {
        console.error(err);
        showToast("標記已重置");
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

  // 相關狀態與業務邏輯
  try {
    photo.originalBlob = file.slice();
  } catch (ignored) {}

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
        point: null,
        photoName: baseName
      };
      photo.tiles.push(tileRecord);
    }
  }

  // 相關狀態與業務邏輯
  const thumbCanvas = document.createElement("canvas");
  const thumbSize = 80;
  thumbCanvas.width = thumbSize;
  thumbCanvas.height = thumbSize;
  const tctx = thumbCanvas.getContext("2d");
  const scale = Math.max(thumbSize / W, thumbSize / H);
  const dw = W * scale, dh = H * scale;
  tctx.drawImage(img, (thumbSize - dw) / 2, (thumbSize - dh) / 2, dw, dh);
  photo.thumbUrl = thumbCanvas.toDataURL("image/jpeg", 0.8);

  finalizePhotoDOM(photo, W, H, rows, cols);
  photos.push(photo);
  updateSidebarCount();
}

/**
 * 函式參數說明與實作邏輯
 * 函式參數說明與實作邏輯
 * 函式參數說明與實作邏輯
 */
function createTileElement(tileRecord) {
  const tileEl = document.createElement("div");
  tileEl.className = "tile";
  tileEl.dataset.state = tileRecord.state || "unlabeled";
  tileEl.tabIndex = 0;
  tileEl.setAttribute("role", "button");

  const imgEl = document.createElement("img");
  imgEl.src = URL.createObjectURL(tileRecord.blob);
  imgEl.alt = "";
  imgEl.draggable = false;
  tileEl.appendChild(imgEl);

  tileRecord.el = tileEl;
  updateTileAriaLabel(tileRecord);
  renderPointMarker(tileRecord, tileEl);

  // 相關狀態與業務邏輯
  // 相關狀態與業務邏輯
  tileEl.addEventListener("pointerdown", (ev) => {
    if (ev.pointerType === "mouse" && ev.button !== 0) return;

    if (ev.shiftKey) {
      startDragAnnotation(tileRecord, tileEl, ev, tileEl);
      return;
    }

    if (ev.pointerType !== "touch") ev.preventDefault();
    // 相關狀態與業務邏輯
    const next = cycleTile(tileRecord, tileEl);
    isPainting = true;
    paintState = next;
    updateSummary();
  });
  tileEl.addEventListener("pointerenter", (ev) => {
    // 相關狀態與業務邏輯
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
    if (zoomLocked) return; // 放大鏡鎖定中，略過更新
    cancelHideZoomPreview();
    hoveredTileRecord = tileRecord;
    showZoomPreview(imgEl.src, tileRecord);
  });
  tileEl.addEventListener("mousemove", (ev) => {
    if (zoomLocked) return; // 放大鏡鎖定中，略過更新
    positionZoomPreview(ev);
  });
  tileEl.addEventListener("mouseleave", () => {
    if (zoomLocked) return; // 放大鏡鎖定中，略過更新
    // 相關狀態與業務邏輯
    scheduleHideZoomPreview();
  });

  // 相關狀態與業務邏輯
  tileEl.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    const delta = ev.deltaY < 0 ? 0.5 : -0.5;
    setZoomLevel(currentZoomLevel + delta);
    if (hoveredTileRecord === tileRecord) {
      positionZoomPreview(ev);
    }
  }, { passive: false });

  return tileEl;
}

/**
 * 函式參數說明與實作邏輯
 */
function renderPointMarker(tileRecord, tileEl) {
  const old = tileEl.querySelector(".tile-point-marker");
  if (old) old.remove();
  const oldBox = tileEl.querySelector(".tile-point-box");
  if (oldBox) oldBox.remove();
  if (!tileRecord.point) return;
  const marker = document.createElement("div");
  marker.className = "tile-point-marker";
  marker.style.left = `${(tileRecord.point.normX * 100).toFixed(2)}%`;
  marker.style.top = `${(tileRecord.point.normY * 100).toFixed(2)}%`;
  const { w: boxW, h: boxH } = pointBoxDims(tileRecord.point);
  marker.title = `已標記 (原圖座標 ${tileRecord.point.origX}, ${tileRecord.point.origY}，${Math.round(boxW)}x${Math.round(boxH)}px)`;
  marker.innerHTML = `<span class="point-ring"></span><span class="point-pin">📍</span>`;
  tileEl.appendChild(marker);
  tileEl.appendChild(buildPointBoxOutline(tileRecord));
}

/**
 * 函式參數說明與實作邏輯
 * 函式參數說明與實作邏輯
 */
function buildPointBoxOutline(tileRecord) {
  const box = document.createElement("div");
  box.className = "tile-point-box";
  const { w: boxW, h: boxH } = pointBoxDims(tileRecord.point);
  box.style.left = `${(tileRecord.point.normX * 100).toFixed(2)}%`;
  box.style.top = `${(tileRecord.point.normY * 100).toFixed(2)}%`;
  box.style.width = `${clamp01(boxW / tileRecord.w) * 100}%`;
  box.style.height = `${clamp01(boxH / tileRecord.h) * 100}%`;
  return box;
}

/**
 * 函式參數說明與實作邏輯
 * 函式參數說明與實作邏輯
 * 函式參數說明與實作邏輯
 */
function finalizePhotoDOM(photo, W, H, rows, cols) {
  for (const t of photo.tiles) {
    if (!t.el) createTileElement(t);
  }

  const block = document.createElement("div");
  block.className = "photo-block";
  block.id = `block-${photo.id}`;

  const head = document.createElement("div");
  head.className = "photo-block-head";
  const heading = document.createElement("h2");
  heading.textContent = `${photo.fileName} (原圖 ${W}x${H}，切為 ${rows}x${cols} = ${rows * cols} 格)`;
  head.appendChild(heading);

  const actions = document.createElement("div");
  actions.className = "photo-actions";
  const markNormalBtn = document.createElement("button");
  markNormalBtn.type = "button";
  markNormalBtn.className = "mini-btn";
  markNormalBtn.textContent = "全設為正常";
  markNormalBtn.title = "將本照片所有未標記格子一次設為正常 (快捷鍵 N)";
  markNormalBtn.addEventListener("click", () => markPhotoAllNormal(photo));
  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "mini-btn mini-btn-danger";
  resetBtn.textContent = "清除標記";
  resetBtn.title = "清除本照片所有標記 (快捷鍵 R)";
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
  for (const t of photo.tiles) {
    grid.appendChild(t.el);
  }
  gridWrap.appendChild(grid);
  block.appendChild(gridWrap);

  photosContainer.appendChild(block);
  photo.blockEl = block;
  applyFilters();

  // 相關狀態與業務邏輯
  const li = document.createElement("li");
  li.className = "sidebar-item";
  li.innerHTML = `
    <img class="sidebar-thumb" src="${photo.thumbUrl || ""}" alt="">
    <div class="sidebar-info">
      <div class="sidebar-name">${escapeHtml(photo.fileName)}</div>
      <div class="sidebar-progress" data-role="progress">0 / ${rows * cols} 已標記</div>
    </div>
    <button class="sidebar-remove" title="移除照片" aria-label="移除照片">🗑️</button>
  `;
  li.querySelector(".sidebar-info").addEventListener("click", () => {
    const idx = photos.findIndex(p => p.id === photo.id);
    if (idx !== -1) {
      showPhoto(idx);
    }
    photoListDrawer.classList.add("collapsed");
  });
  li.querySelector(".sidebar-remove").addEventListener("click", (ev) => {
    ev.stopPropagation();
    const labeled = photo.tiles.filter(t => t.state !== "unlabeled").length;
    if (labeled > 0 && !confirm(`${photo.fileName} 已有 ${labeled} 處標記，確定要移除此照片嗎？`)) {
      return;
    }
    removePhoto(photo.id);
  });

  const emptyMsg = document.getElementById("sidebar-empty-msg");
  if (emptyMsg) emptyMsg.remove();
  sidebarList.appendChild(li);
  photo.sidebarEl = li;
}

/**
 * 函式參數說明與實作邏輯
 */
async function rebuildPhotoFromStored(pd) {
  if (!pd || !pd.tiles || pd.tiles.length === 0) return;
  const first = pd.tiles[0];
  const W = first.origW;
  const H = first.origH;
  let rows = 0, cols = 0;
  for (const t of pd.tiles) {
    rows = Math.max(rows, t.row + 1);
    cols = Math.max(cols, t.col + 1);
  }
  const baseName = pd.fileName.replace(/\.[^.]+$/, "");
  const photoId = `p${++photoCounter}`;

  const photo = {
    id: photoId,
    fileName: pd.fileName,
    tiles: [],
    originalBlob: pd.originalBlob || null,
    thumbUrl: pd.thumbUrl || ""
  };

  for (const t of pd.tiles) {
    if (!t.blob) continue; // 無 blob 則略過
    photo.tiles.push({
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
      state: t.state || "unlabeled",
      abnormalType: t.abnormalType || null,
      point: t.point || null,
      photoName: t.photoName || baseName
    });
  }

  if (photo.tiles.length === 0) return;

  finalizePhotoDOM(photo, W, H, rows, cols);
  photos.push(photo);
  updateSidebarCount();
}

function cycleTile(tileRecord, tileEl) {
  const next = STATE_CYCLE[(STATE_CYCLE.indexOf(tileRecord.state) + 1) % STATE_CYCLE.length];
  setTileState(tileRecord, tileEl, next);
  return next;
}

function setTileState(tileRecord, tileEl, state, skipUndo = false, newPointData = undefined) {
  const oldPoint = tileRecord.point ? { ...tileRecord.point } : null;
  // 相關狀態與業務邏輯
  // 相關狀態與業務邏輯
  // 相關狀態與業務邏輯
  // 相關狀態與業務邏輯
  let finalPoint;
  if (newPointData !== undefined) {
    finalPoint = newPointData;
  } else if (state !== "abnormal") {
    finalPoint = null;
  } else {
    finalPoint = oldPoint;
  }

  if (!skipUndo) {
    undoStack.push({
      tile: tileRecord,
      oldState: tileRecord.state,
      oldAbnormalType: tileRecord.abnormalType,
      oldPoint,
      newState: state,
      newAbnormalType: state === "abnormal" ? (tileRecord.abnormalType || currentAbnormalType) : null,
      newPoint: finalPoint
    });
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack.length = 0; // 新操作清空重做堆疊
  }
  tileRecord.state = state;
  tileEl.dataset.state = state;
  if (state === "abnormal") {
    if (!tileRecord.abnormalType) tileRecord.abnormalType = currentAbnormalType;
  } else {
    tileRecord.abnormalType = null;
  }
  tileRecord.point = finalPoint || null;
  renderPointMarker(tileRecord, tileEl);
  updateTileAriaLabel(tileRecord);
}

function performUndo() {
  showToast("已複製到剪貼簿");
  const action = undoStack.pop();
  redoStack.push(action);
  action.tile.state = action.oldState;
  action.tile.abnormalType = action.oldAbnormalType;
  action.tile.point = action.oldPoint || null;
  action.tile.el.dataset.state = action.oldState;
  renderPointMarker(action.tile, action.tile.el);
  updateTileAriaLabel(action.tile);
  updateSummary();
  showToast("已複製到剪貼簿");
}

function performRedo() {
  if (redoStack.length === 0) { showToast("沒有可重做的操作"); return; }
  const action = redoStack.pop();
  undoStack.push(action);
  action.tile.state = action.newState;
  action.tile.abnormalType = action.newAbnormalType;
  action.tile.point = action.newPoint || null;
  action.tile.el.dataset.state = action.newState;
  renderPointMarker(action.tile, action.tile.el);
  updateTileAriaLabel(action.tile);
  updateSummary();
  showToast("標記已重置");
}

function updateTileAriaLabel(tileRecord) {
  let labelText = STATE_LABEL[tileRecord.state];
  if (tileRecord.state === "abnormal" && tileRecord.abnormalType) {
    const typeInfo = ABNORMAL_TYPES[tileRecord.abnormalType] || { label: "異常", emoji: "⚠️" };
    labelText += ` [${typeInfo.emoji} ${typeInfo.label}]`;
  }
  tileRecord.el.setAttribute(
    "aria-label",
    `第 ${tileRecord.row + 1} 列第 ${tileRecord.col + 1} 行：${labelText}`
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
    showToast("已還原標註進度");
  } else {
    showToast(`已將 ${changed} 個未標記格子設為正常`);
  }
  updateSummary();
}

function resetPhotoLabels(photo) {
  const labeled = photo.tiles.filter(t => t.state !== "unlabeled").length;
  if (labeled === 0) return;
  if (!confirm(`確定要重置 ${photo.fileName} 中的 ${labeled} 個標記嗎？`)) return;
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
    if (hoveredTileRecord === t) { hoveredTileRecord = null; zoomLocked = false; }
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
    ? `確定要清除全部 ${photos.length} 張照片嗎？已標記的資料也會一併刪除！`
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
  return s.length > 40 ? `${s.slice(0, 37)}...` : s;
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
    if (prog) prog.textContent = `${pLabeled} / ${pTotal} 已標記`;
    p.sidebarEl.classList.toggle("is-complete", pLabeled === pTotal && pTotal > 0);
  }

  // 相關狀態與業務邏輯
  const progressPercent = total > 0 ? Math.round((normal + abnormal) / total * 100) : 0;
  const progressPercentEl = document.getElementById("progress-percent");
  const progressFillEl = document.getElementById("progress-fill");
  if (progressPercentEl) progressPercentEl.textContent = `${progressPercent}%`;
  if (progressFillEl) progressFillEl.style.width = `${progressPercent}%`;

  // 相關狀態與業務邏輯
  debounceSaveState();
}

// 相關狀態與業務邏輯
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

// 相關狀態與業務邏輯
// 相關狀態與業務邏輯
async function doExportDataset(format = "patchcore", splitPercent = 10, shouldAug = false) {
  const tiles = allTiles();
  const normalTiles = tiles.filter(t => t.state === "normal");
  const abnormalTiles = tiles.filter(t => t.state === "abnormal");

  if (normalTiles.length === 0 && abnormalTiles.length === 0) {
    showToast("已還原標註進度");
    return;
  }

  exportBtn.disabled = true;
  const originalLabel = exportBtn.textContent;
  exportBtn.textContent = "匯出中...";

  try {
    const splitRatio = Math.max(0, Math.min(50, splitPercent)) / 100;

    const CLASS_INDEX = { mite: 0, dwv: 1, debris: 2, dead: 3, other: 4 };
    const CLASS_NAMES = ["mite", "dwv", "debris", "dead", "other"];

    // 相關狀態與業務邏輯
    // 相關狀態與業務邏輯
    // 相關狀態與業務邏輯
    const tilePhotoId = new Map();
    for (const p of photos) {
      for (const t of p.tiles) tilePhotoId.set(t, p.id);
    }

    // 相關狀態與業務邏輯
    // 相關狀態與業務邏輯
    const photosWithNormal = photos.filter(p => p.tiles.some(t => t.state === "normal"));
    const totalNormalCount = photosWithNormal.reduce((sum, p) => sum + p.tiles.filter(t => t.state === "normal").length, 0);
    const targetTestNormalCount = totalNormalCount >= 4 ? Math.max(1, Math.round(totalNormalCount * splitRatio)) : 0;
    const shuffledPhotos = [...photosWithNormal].sort(() => Math.random() - 0.5);
    const testPhotoIds = new Set();
    let accumulatedTestNormal = 0;
    for (const p of shuffledPhotos) {
      if (accumulatedTestNormal >= targetTestNormalCount) break;
      if (testPhotoIds.size >= photosWithNormal.length - 1) break; // 至少保留一張在訓練集
      testPhotoIds.add(p.id);
      accumulatedTestNormal += p.tiles.filter(t => t.state === "normal").length;
    }
    // 相關狀態與業務邏輯
    const hasHoldoutPhotos = testPhotoIds.size > 0;

    const zip = new JSZip();

    // 相關狀態與業務邏輯
    if (format === "patchcore" || format === "both") {
      const trainNormal = normalTiles.filter(t => !testPhotoIds.has(tilePhotoId.get(t)));
      const testNormal = normalTiles.filter(t => testPhotoIds.has(tilePhotoId.get(t)));

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
      // 相關狀態與業務邏輯
      let hasPointMasks = false;
      for (const t of abnormalTiles) {
        const subFolder = t.abnormalType ? `abnormal_${t.abnormalType}` : "abnormal";
        pcRoot.folder(`test/${subFolder}`).file(tileFileName(t), t.blob);

        // 相關狀態與業務邏輯
        // 相關狀態與業務邏輯
        if (t.point) hasPointMasks = true;
        const maskBlob = await createMaskBlob(t);
        pcRoot.folder(`test/mask/${subFolder}`).file(maskFileName(t), maskBlob);
      }

      // 相關狀態與業務邏輯
      const usedAbnormalFolders = [...new Set(abnormalTiles.map(t => t.abnormalType ? `abnormal_${t.abnormalType}` : "abnormal"))];
      pcRoot.file("anomalib_patchcore_config.yaml", buildAnomalibConfigYaml(usedAbnormalFolders, hasPointMasks));
    }

    // 相關狀態與業務邏輯
    if (format === "yolo" || format === "both") {
      const yoloRoot = format === "both" ? zip.folder("yolo_dataset") : zip;

      // 相關狀態與業務邏輯
      // 相關狀態與業務邏輯
      const valImgDir = hasHoldoutPhotos ? "images/val" : "images/train";
      const yamlContent = `path: ./dataset\ntrain: images/train\nval: ${valImgDir}\nnc: 5\nnames: ['mite', 'dwv', 'debris', 'dead', 'other']\n`;
      yoloRoot.file("data.yaml", yamlContent);

      // 相關狀態與業務邏輯
      for (const t of [...normalTiles, ...abnormalTiles]) {
        const base = tileFileName(t).replace(/\.jpg$/, "");
        const isVal = hasHoldoutPhotos && testPhotoIds.has(tilePhotoId.get(t));
        const imgFolder = isVal ? "images/val" : "images/train";
        const labelFolder = isVal ? "labels/val" : "labels/train";
        yoloRoot.folder(imgFolder).file(`${base}.jpg`, t.blob);

        if (t.state === "abnormal") {
          const classId = CLASS_INDEX[t.abnormalType] ?? 0;
          let txtLine;
          if (t.point) {
            // 相關狀態與業務邏輯
            const { w: boxW, h: boxH } = pointBoxDims(t.point);
            const xCenter = clamp01(t.point.normX);
            const yCenter = clamp01(t.point.normY);
            const wNorm = clamp01(boxW / t.w);
            const hNorm = clamp01(boxH / t.h);
            txtLine = `${classId} ${xCenter.toFixed(6)} ${yCenter.toFixed(6)} ${wNorm.toFixed(6)} ${hNorm.toFixed(6)}\n`;
          } else {
            // 相關狀態與業務邏輯
            txtLine = `${classId} 0.500000 0.500000 1.000000 1.000000\n`;
          }
          yoloRoot.folder(labelFolder).file(`${base}.txt`, txtLine);
        } else {
          // 相關狀態與業務邏輯
          yoloRoot.folder(labelFolder).file(`${base}.txt`, "");
        }
      }

      // 相關狀態與業務邏輯
      for (const p of photos) {
        const pAbnormals = p.tiles.filter(t => t.state === "abnormal");
        const lines = [];
        for (const t of pAbnormals) {
          const classId = CLASS_INDEX[t.abnormalType] ?? 0;
          let xCenter, yCenter, widthNorm, heightNorm;
          if (t.point) {
            // 相關狀態與業務邏輯
            const { w: boxW, h: boxH } = pointBoxDims(t.point);
            const origX = t.point.origX ?? (t.left + t.point.normX * t.w);
            const origY = t.point.origY ?? (t.top + t.point.normY * t.h);
            xCenter = origX / t.origW;
            yCenter = origY / t.origH;
            widthNorm = clamp01(boxW / t.origW);
            heightNorm = clamp01(boxH / t.origH);
          } else {
            // 相關狀態與業務邏輯
            xCenter = (t.left + t.w / 2) / t.origW;
            yCenter = (t.top + t.h / 2) / t.origH;
            widthNorm = t.w / t.origW;
            heightNorm = t.h / t.origH;
          }
          lines.push(`${classId} ${xCenter.toFixed(6)} ${yCenter.toFixed(6)} ${widthNorm.toFixed(6)} ${heightNorm.toFixed(6)}`);
        }
        yoloRoot.folder("full_image_labels").file(`${p.fileName.replace(/\.[^.]+$/, "")}.txt`, lines.join("\n"));
      }
    }

    // 相關狀態與業務邏輯
    if (format === "classification" || format === "both") {
      const clsRoot = format === "both" ? zip.folder("classification_dataset") : zip.folder("dataset");
      for (const t of normalTiles) {
        clsRoot.folder("normal").file(tileFileName(t), t.blob);
      }
      for (const t of abnormalTiles) {
        clsRoot.folder("abnormal").file(tileFileName(t), t.blob);
      }
    }

    // 相關狀態與業務邏輯
    const shouldBackup = document.getElementById("modal-backup-originals");
    if (shouldBackup && shouldBackup.checked) {
      for (const p of photos) {
        if (p.originalBlob) {
          zip.folder("originals").file(p.fileName, p.originalBlob);
        }
      }
    }

    // 相關狀態與業務邏輯
    if (typeof XLSX !== "undefined") {
      const rows = [];
      const abnormalKeys = Object.keys(ABNORMAL_TYPES);
      for (const p of photos) {
        const pTiles = p.tiles;
        const row = {
          "照片檔名": p.fileName,
          "總格數": pTiles.length,
          "正常": pTiles.filter(t => t.state === "normal").length,
          "異常": pTiles.filter(t => t.state === "abnormal").length,
          "未標記": pTiles.filter(t => t.state === "unlabeled").length
        };
        for (const key of abnormalKeys) {
          row[ABNORMAL_TYPES[key].label] = pTiles.filter(t => t.state === "abnormal" && t.abnormalType === key).length;
        }
        rows.push(row);
      }
      // 相關狀態與業務邏輯
      const totalRow = { "照片檔名": "合計" };
      for (const col of Object.keys(rows[0]).filter(k => k !== "照片檔名")) {
        totalRow[col] = rows.reduce((sum, r) => sum + (r[col] || 0), 0);
      }
      rows.push(totalRow);

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "標註統計");
      const xlsxData = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      zip.file("report.xlsx", xlsxData);
    }

    // 相關狀態與業務邏輯
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
          },
          point: t.point ? {
            orig_x: t.point.origX,
            orig_y: t.point.origY,
            tile_norm_x: t.point.normX,
            tile_norm_y: t.point.normY,
            width_px: pointBoxDims(t.point).w,
            height_px: pointBoxDims(t.point).h,
            yolo_box: {
              box_px: t.point.boxPx || DEFAULT_POINT_BOX_PX, // 標記框尺寸
              x_center_norm: +(t.point.origX / t.origW).toFixed(6),
              y_center_norm: +(t.point.origY / t.origH).toFixed(6),
              width_norm: +clamp01(pointBoxDims(t.point).w / t.origW).toFixed(6),
              height_norm: +clamp01(pointBoxDims(t.point).h / t.origH).toFixed(6)
            }
          } : null
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

    const holdoutNote = hasHoldoutPhotos
      ? `，已保留 ${testPhotoIds.size} 張作為測試集`
      : (photosWithNormal.length > 0 ? "，無足夠正常樣本切分測試集" : "");
    const maskNote = (format === "patchcore" || format === "both") ? "，並已產生 test/mask 遮罩圖" : "";
    showToast("標記已重置");
  } catch (err) {
    console.error(err);
    showToast("匯出失敗，請檢查主控台");
  } finally {
    exportBtn.disabled = (normalTiles.length + abnormalTiles.length) === 0;
    exportBtn.textContent = originalLabel;
  }
}

// 相關狀態與業務邏輯
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
        showToast("匯入失敗: " + (err.message || "JSON 格式錯誤"));
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
            const importedPoint = jt.point
              ? {
                  normX: jt.point.tile_norm_x,
                  normY: jt.point.tile_norm_y,
                  origX: jt.point.orig_x,
                  origY: jt.point.orig_y,
                  boxPx: jt.point.yolo_box ? jt.point.yolo_box.box_px : undefined,
                  // 相關狀態與業務邏輯
                  widthPx: jt.point.width_px ?? (jt.point.yolo_box ? jt.point.yolo_box.box_px : undefined),
                  heightPx: jt.point.height_px ?? (jt.point.yolo_box ? jt.point.yolo_box.box_px : undefined)
                }
              : null;
            setTileState(localTile, localTile.el, jt.state, true, importedPoint);
            matched++;
          }
        }
      }
      updateSummary();
      showToast(`匯入完成：成功配對 ${matched} 張照片${skipped > 0 ? `，略過 ${skipped} 張` : ""}`);
    } catch (err) {
      console.error(err);
      showToast("匯入失敗: " + (err.message || "JSON 格式錯誤"));
    }
    importJsonInput.value = "";
  });
}

// 相關狀態與業務邏輯
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
      originalBlob: p.originalBlob || null,
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

// 相關狀態與業務邏輯
async function checkAndRestoreProject() {
  try {
    const db = await openDB();
    const tx = db.transaction("projectState", "readonly");
    const store = tx.objectStore("projectState");

    const data = await new Promise((resolve) => {
      const req = store.get("current_project");
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });

    if (!data || !data.photos || data.photos.length === 0) return;

    showLoading("正在載入歷史標註進度...");
    await nextFrame();

    let restoredCount = 0;
    for (const pd of data.photos) {
      try {
        await rebuildPhotoFromStored(pd);
        restoredCount++;
      } catch (err) {
        console.error("載入進度失敗:", pd && pd.fileName, err);
      }
    }

    hideLoading();

    if (restoredCount > 0) {
      showPhoto(0);
      updateSummary();
      showToast(`已自動還原上次標註進度，共 ${restoredCount} 張照片`);
    }
  } catch (err) {
    console.log("No previous session found.", err);
    hideLoading();
  }
}

checkAndRestoreProject();

// 相關狀態與業務邏輯
// 相關狀態與業務邏輯
let zoomHideTimer = null;
function scheduleHideZoomPreview() {
  clearTimeout(zoomHideTimer);
  zoomHideTimer = setTimeout(() => {
    hideZoomPreview();
    hoveredTileRecord = null;
    zoomLocked = false;
  }, 220);
}
function cancelHideZoomPreview() {
  clearTimeout(zoomHideTimer);
}

// 相關狀態與業務邏輯
let shiftKeyActive = false;
function setShiftUIState(active) {
  if (shiftKeyActive === active) return;
  shiftKeyActive = active;
  if (zoomPreviewImgWrap) zoomPreviewImgWrap.classList.toggle("shift-clickable", active);
  if (zoomShiftHint) zoomShiftHint.hidden = !(active && hoveredTileRecord);

  if (active && hoveredTileRecord) {
    // 相關狀態與業務邏輯
    // 相關狀態與業務邏輯
    cancelHideZoomPreview();
    zoomLocked = true;
  } else if (!active) {
    // 相關狀態與業務邏輯
    zoomLocked = false;
  }
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Shift") setShiftUIState(true);
});
document.addEventListener("keyup", (e) => {
  if (e.key === "Shift") setShiftUIState(false);
});
window.addEventListener("blur", () => { setShiftUIState(false); zoomLocked = false; });

if (zoomPreviewImg) {
  zoomPreviewImg.addEventListener("mouseenter", cancelHideZoomPreview);
  zoomPreviewImg.addEventListener("mouseleave", scheduleHideZoomPreview);

  // 相關狀態與業務邏輯
  // 相關狀態與業務邏輯
  zoomPreviewImg.addEventListener("pointerdown", (ev) => {
    if (!ev.shiftKey || !hoveredTileRecord) return;
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    startDragAnnotation(hoveredTileRecord, zoomPreviewImg, ev, zoomPreviewImgWrap);
  });
}

/**
 * 函式參數說明與實作邏輯
 * 函式參數說明與實作邏輯
 * 函式參數說明與實作邏輯
 * 函式參數說明與實作邏輯
 * 函式參數說明與實作邏輯
 * 函式參數說明與實作邏輯
 * 函式參數說明與實作邏輯
 */
function startDragAnnotation(tileRecord, coordEl, downEvent, previewContainer) {
  downEvent.preventDefault();
  downEvent.stopPropagation();
  const rect = coordEl.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const container = previewContainer || coordEl;

  const startX = Math.min(rect.width, Math.max(0, downEvent.clientX - rect.left));
  const startY = Math.min(rect.height, Math.max(0, downEvent.clientY - rect.top));
  let curX = startX;
  let curY = startY;
  let moved = false;

  const previewEl = document.createElement("div");
  previewEl.className = "drag-box-preview";
  previewEl.hidden = true;
  container.appendChild(previewEl);

  function updatePreview() {
    const left = Math.min(startX, curX);
    const top = Math.min(startY, curY);
    const w = Math.abs(curX - startX);
    const h = Math.abs(curY - startY);
    previewEl.style.left = `${(left / rect.width) * 100}%`;
    previewEl.style.top = `${(top / rect.height) * 100}%`;
    previewEl.style.width = `${(w / rect.width) * 100}%`;
    previewEl.style.height = `${(h / rect.height) * 100}%`;
  }

  function onMove(mv) {
    curX = Math.min(rect.width, Math.max(0, mv.clientX - rect.left));
    curY = Math.min(rect.height, Math.max(0, mv.clientY - rect.top));
    const dx = Math.abs(curX - startX);
    const dy = Math.abs(curY - startY);
    if (!moved && (dx > DRAG_THRESHOLD_PX || dy > DRAG_THRESHOLD_PX)) {
      moved = true;
      previewEl.hidden = false;
    }
    if (moved) updatePreview();
  }

  function onUp() {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    previewEl.remove();

    if (!moved) {
      // 相關狀態與業務邏輯
      const normX = rect.width > 0 ? startX / rect.width : 0.5;
      const normY = rect.height > 0 ? startY / rect.height : 0.5;
      applyPointAnnotation(tileRecord, normX, normY);
    } else {
      const x1 = Math.min(startX, curX) / rect.width;
      const x2 = Math.max(startX, curX) / rect.width;
      const y1 = Math.min(startY, curY) / rect.height;
      const y2 = Math.max(startY, curY) / rect.height;
      applyBoxAnnotation(tileRecord, x1, y1, x2, y2);
    }
  }

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, { once: true });
}

/**
 * 函式參數說明與實作邏輯
 * 函式參數說明與實作邏輯
 */
function applyPointAnnotation(tileRecord, normX, normY) {
  normX = clamp01(normX);
  normY = clamp01(normY);
  const tileX = normX * tileRecord.w;
  const tileY = normY * tileRecord.h;
  const origX = Math.round(tileRecord.left + tileX);
  const origY = Math.round(tileRecord.top + tileY);

  setTileState(tileRecord, tileRecord.el, "abnormal", false, {
    normX, normY, origX, origY,
    boxPx: currentPointBoxPx,
    widthPx: currentPointBoxPx,
    heightPx: currentPointBoxPx
  });
  updateSummary();
  if (hoveredTileRecord === tileRecord) {
    renderZoomPointMarker(tileRecord);
  }
  showToast(`已設定標記點 (原圖座標 ${origX}, ${origY})，預設標記框 ${currentPointBoxPx}x${currentPointBoxPx}px`);
}

/**
 * 函式參數說明與實作邏輯
 * 函式參數說明與實作邏輯
 * 函式參數說明與實作邏輯
 */
function applyBoxAnnotation(tileRecord, x1n, y1n, x2n, y2n) {
  x1n = clamp01(x1n); x2n = clamp01(x2n);
  y1n = clamp01(y1n); y2n = clamp01(y2n);

  const widthPx = Math.max(4, Math.round((x2n - x1n) * tileRecord.w));
  const heightPx = Math.max(4, Math.round((y2n - y1n) * tileRecord.h));
  const normX = (x1n + x2n) / 2;
  const normY = (y1n + y2n) / 2;
  const tileX = normX * tileRecord.w;
  const tileY = normY * tileRecord.h;
  const origX = Math.round(tileRecord.left + tileX);
  const origY = Math.round(tileRecord.top + tileY);
  // 相關狀態與業務邏輯
  const boxPx = Math.max(widthPx, heightPx);

  setTileState(tileRecord, tileRecord.el, "abnormal", false, { normX, normY, origX, origY, boxPx, widthPx, heightPx });
  updateSummary();
  if (hoveredTileRecord === tileRecord) {
    renderZoomPointMarker(tileRecord);
  }
  showToast("標記已重置");
}

/**
 * 函式參數說明與實作邏輯
 */
function renderZoomPointMarker(tileRecord) {
  if (!zoomPreviewImgWrap) return;
  const old = zoomPreviewImgWrap.querySelector(".tile-point-marker");
  if (old) old.remove();
  const oldBox = zoomPreviewImgWrap.querySelector(".tile-point-box");
  if (oldBox) oldBox.remove();
  if (!tileRecord || !tileRecord.point) return;
  const marker = document.createElement("div");
  marker.className = "tile-point-marker";
  marker.style.left = `${(tileRecord.point.normX * 100).toFixed(2)}%`;
  marker.style.top = `${(tileRecord.point.normY * 100).toFixed(2)}%`;
  marker.innerHTML = `<span class="point-ring"></span><span class="point-pin">📍</span>`;
  zoomPreviewImgWrap.appendChild(marker);
  zoomPreviewImgWrap.appendChild(buildPointBoxOutline(tileRecord));
}

function showZoomPreview(src, tileRecord) {
  zoomPreviewImg.src = src;
  if (globalFilter) {
    zoomPreviewImg.style.filter = globalFilter;
    if(zoomPreview) zoomPreview.style.filter = globalFilter;
    zoomPreviewImg.style.webkitFilter = globalFilter;
    if(zoomPreview) zoomPreview.style.webkitFilter = globalFilter;
  }
  let statusText = STATE_LABEL[tileRecord.state] || "未標記";
  if (tileRecord.state === "abnormal" && tileRecord.abnormalType) {
    const typeInfo = ABNORMAL_TYPES[tileRecord.abnormalType] || { label: "異常", emoji: "⚠️" };
    statusText += ` [${typeInfo.emoji} ${typeInfo.label}]`;
  }
  zoomPreviewCaption.textContent = `${tileRecord.photoName}_r${String(tileRecord.row).padStart(2, "0")}_c${String(tileRecord.col).padStart(2, "0")}  (${statusText})`;
  if (zoomBadge) zoomBadge.textContent = `${currentZoomLevel.toFixed(1)}x`;
  if (zoomShiftHint) zoomShiftHint.hidden = !shiftKeyActive;
  renderZoomPointMarker(tileRecord);
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
  if (zoomShiftHint) zoomShiftHint.hidden = true;
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

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function tileFileName(t, suffix = "") {
  return `${t.photoName}_r${String(t.row).padStart(2, "0")}_c${String(t.col).padStart(2, "0")}${suffix}.jpg`;
}

// 相關狀態與業務邏輯
function maskFileName(t) {
  return tileFileName(t).replace(/\.jpg$/i, ".png");
}

/**
 * 函式參數說明與實作邏輯
 * 函式參數說明與實作邏輯
 * 函式參數說明與實作邏輯
 * 函式參數說明與實作邏輯
 * 函式參數說明與實作邏輯
 * 函式參數說明與實作邏輯
 */
async function createMaskBlob(t) {
  const canvas = document.createElement("canvas");
  canvas.width = t.w;
  canvas.height = t.h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, t.w, t.h);
  ctx.fillStyle = "#ffffff";
  if (t.point) {
    const { w: boxW, h: boxH } = pointBoxDims(t.point);
    const cx = clamp01(t.point.normX) * t.w;
    const cy = clamp01(t.point.normY) * t.h;
    const rx = Math.max(2, boxW / 2);
    const ry = Math.max(2, boxH / 2);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(0, 0, t.w, t.h);
  }
  return new Promise(resolve => canvas.toBlob(resolve, "image/png"));
}

function dateStamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/**
 * 函式參數說明與實作邏輯
 * 函式參數說明與實作邏輯
 * 函式參數說明與實作邏輯
 * 函式參數說明與實作邏輯
 * 函式參數說明與實作邏輯
 */
function buildAnomalibConfigYaml(abnormalFolders, hasPointMasks = false) {
  const abnormalDirYaml = abnormalFolders.length > 0
    ? `[${abnormalFolders.map(f => `"${f}"`).join(", ")}]`
    : "null  # 缺乏異常樣本，已略過 mask 目錄設定";
  const maskDirYaml = abnormalFolders.length > 0
    ? `[${abnormalFolders.map(f => `"test/mask/${f}"`).join(", ")}]`
    : "null";
  const maskNote = abnormalFolders.length === 0
    ? "# mask 建議使用精確標註"
    : (hasPointMasks
      ? "# mask 建議使用精確標註"
      : "# 無異常標記，使用預設設定");
  return `# Anomalib 訓練設定檔 (PatchCore)
# 1. 請將本設定檔放在資料夾根目錄
# 執行 anomalib 訓練指令
# 3. 亦可配合 Folder datamodule 自訂超參數
# 執行 anomalib 訓練指令
model:
  class_path: anomalib.models.Patchcore
  init_args:
    backbone: wide_resnet50_2
    layers: ["layer2", "layer3"]
    coreset_sampling_ratio: 0.1
    num_neighbors: 9
data:
  class_path: anomalib.data.Folder
  init_args:
    name: "bee_mite"
    root: "."
    normal_dir: "train/good"
    abnormal_dir: ${abnormalDirYaml}
    normal_test_dir: "test/good"
    ${maskNote}
    mask_dir: ${maskDirYaml}
    extensions: [".jpg"]
    image_size: [256, 256]
    train_batch_size: 32
    eval_batch_size: 8
    num_workers: 4
    task: segmentation
    test_split_mode: from_dir
    val_split_mode: same_as_test
    val_split_ratio: 0.5
    seed: 42
trainer:
  max_epochs: 1
  accelerator: auto
`;
}
