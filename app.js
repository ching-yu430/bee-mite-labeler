// ???閮餃極??

// 瘥撐?抒?靘雯?澆????潘????璅?/ 甇?虜 / ?啣虜??敺芰嚗?

// 瘥撐?抒?靘雯?澆????潘??€??璅?/ 甇?虜 / ?啣虜??敺芰嚗?

// ?臬??? anomalib / PatchCore ????dataset/train/test 鞈?憭暹撘€?



const STATE_CYCLE = ["unlabeled", "normal", "abnormal"];

const STATE_LABEL = { unlabeled: "未標記", normal: "正常", abnormal: "異常" };



// ?祕?拳?抒???銋敦?撣豢?蝐文?蝢?

const ABNORMAL_TYPES = {

  mite: { label: "蜂蟹蟎成蟲/幼蟲", emoji: "🐞", code: "mite" },

  dwv: { label: "殘翅/發育不良(DWV)", emoji: "🐝", code: "dwv" },

  debris: { label: "異物/蠟屑", emoji: "🍂", code: "debris" },

  dead: { label: "死蜂/發黑蜂蛹", emoji: "💀", code: "dead" },

  other: { label: "其他", emoji: "?", code: "other" }

};

let currentAbnormalType = "mite";

let currentZoomLevel = 3.0; // ?身?曉之?∪?

let globalFilter = ""; // ?其?閮??桀??蕪?∪??賂?霈憭折撘瑕憟



// Shift+?桃?暺??蝙?函??箏???獢???(px)嚗?翰????亦 Shift+??急?嚗?// ??交?冽??喳?祕?祝擃?銝?甇方身摰??嗚?

// ?舫?撌亙?矽?湛?瘥活?????嗡??澆??脰府蝑?閮鳴?t.point.boxPx嚗?

// 銋?隤踵?典?閮剖?銝?敶梢撌脫?閮???璅酉??

const DEFAULT_POINT_BOX_PX = 20;

let currentPointBoxPx = DEFAULT_POINT_BOX_PX;



// Shift+??急????頝撠甇文?蝝潸??箝蝝???????摰偕撖豢獢??嫣噶敹恍??

const DRAG_THRESHOLD_PX = 6;



// 蝯曹???銝蝑?point 璅酉撖阡?????撖祇?嚗x嚗?

// ?芸??冽??喟?箇? widthPx/heightPx嚗???閰梧?靘?敹恍????臬?? JSON嚗??boxPx ?孵耦嚗?

// ?抵瘝?撠梁?典??身?潦? YOLO ?臬?ask 蝜芾ˊ?摮???蝺＊蝷箏?剁?蝣箔?銝?蝞?銝?氬?

function pointBoxDims(point) {

  if (!point) return { w: DEFAULT_POINT_BOX_PX, h: DEFAULT_POINT_BOX_PX };

  const w = point.widthPx || point.boxPx || DEFAULT_POINT_BOX_PX;

  const h = point.heightPx || point.boxPx || DEFAULT_POINT_BOX_PX;

  return { w, h };

}



// A: ?日/????

const undoStack = [];

const redoStack = [];

const MAX_UNDO = 200;



// J: ?萇撠

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



// ?憛璅酉?函????

let isPainting = false;

let paintState = null;

// ?桀?皛????摮?靘?文翰?琿雿輻嚗?

let hoveredTileRecord = null;

// ?? Shift ??摰憭折嚗??曌???摮宏??曉之???楝銝?

// ???嗡??澆?閫貊摰? mouseenter嚗??湔憭折?批捆鋡怠????????let zoomLocked = false;



// DOM ??

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



// ?臬敶閬???

const exportModal = document.getElementById("export-modal");

const modalCloseBtn = document.getElementById("modal-close-btn");

const modalCancelBtn = document.getElementById("modal-cancel-btn");

const modalConfirmExportBtn = document.getElementById("modal-confirm-export-btn");

const modalTestSplit = document.getElementById("modal-test-split");

const modalAugFlip = document.getElementById("modal-aug-flip");



// ?臬?????交炎敶閬???

const healthCheckModal = document.getElementById("health-check-modal");

const healthCloseBtn = document.getElementById("health-close-btn");

const healthCancelBtn = document.getElementById("health-cancel-btn");

const healthConfirmBtn = document.getElementById("health-confirm-btn");

const healthStatList = document.getElementById("health-stat-list");

const healthWarnList = document.getElementById("health-warn-list");

// 雿輻??交炎閬?????閬匱蝥?箝????瑁??祕??箏?雿?

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



// 瞈暸?憭折??

const filterBrightness = document.getElementById("filter-brightness");

const filterContrast = document.getElementById("filter-contrast");

const btnResetFilters = document.getElementById("btn-reset-filters");

const btnSharpen = document.getElementById("btn-sharpen");

const btnClahe = document.getElementById("btn-clahe");

const btnAiPredict = document.getElementById("btn-ai-predict");

const btnClearDb = document.getElementById("btn-clear-db");

const zoomLevelBtns = document.querySelectorAll(".zoom-level-btn");

const zoomLevelSelect = document.getElementById("zoom-level-select");

if (zoomLevelSelect) zoomLevelSelect.addEventListener("change", (e) => setZoomLevel(parseFloat(e.target.value)));

const pointBoxBtns = document.querySelectorAll(".point-box-btn");

const pointBoxSelect = document.getElementById("point-box-select");

if (pointBoxSelect) pointBoxSelect.addEventListener("change", (e) => setPointBoxPx(parseFloat(e.target.value)));



// 鈭辣蝬?

photoInput.addEventListener("change", handleFiles);

exportBtn.addEventListener("click", openExportModal);



if (btnClearDb) {

  btnClearDb.addEventListener("click", () => {

    if (confirm("蝣箏?閬??斤汗?冽?唳摮蒂?蔭撠???")) {

      clearIndexedDB();

      clearAllPhotos();

showToast("訊息顯示");

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



// 敹恍???Ｘ?批嚗歇?寧 shortcuts-modal 敶閬?嚗??蝙?刻?????選?

// shortcutsPanel / shortcutsChevron 撌脩宏?歹?敹恍???寧 shortcutsModal 敶憿舐內



// 撌血?啣虜憿銝??詨

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

  showToast("Switched to " + typeInfo.label);

}



// ?臬敶閬?嚗odal嚗?隞嗥?摰?

function openExportModal() {

  const tiles = allTiles();

  const normalTiles = tiles.filter(t => t.state === "normal");

  const abnormalTiles = tiles.filter(t => t.state === "abnormal");

  if (normalTiles.length === 0 && abnormalTiles.length === 0) {

showToast("訊息顯示");

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

    // 甇??????頝唾????交炎閬?嚗蝙?刻Ⅱ隤????銵??

    openHealthCheckModal(() => doExportDataset(format, splitPercent, shouldAug));

  });

}



// ?臬?????交炎嚗絞閮??啣虜憿撘菜?迤撣??啣虜瘥?嚗?

// 銝血?璅??賊?撠?<10 撘蛛????交??箄郎???踹?蝺游靘? PatchCore/YOLO 璅∪?銝帘摰?

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

      warnings.push("樣本數量不足");

    }

  }

  if (normal > 0 && normal < MIN_HEALTHY_SAMPLES) {

      warnings.push("樣本數量不足");

  }

  if (normal === 0 && abnormal > 0) {

      warnings.push("樣本數量不足");

  }



  return { normal, abnormal, byClass, warnings };

}



function renderHealthCheckModal(stats) {

  if (healthStatList) {

    const rows = [];

    rows.push(`<div class="health-stat-row"><span>??甇?虜</span><span class="health-stat-num">${stats.normal} ??/span></div>`);

    rows.push(`<div class="health-stat-row"><span>?? ?啣虜??</span><span class="health-stat-num">${stats.abnormal} ??/span></div>`);



    let ratioText;

    if (stats.abnormal > 0 && stats.normal > 0) {

      ratioText = `蝝?${(stats.normal / stats.abnormal).toFixed(1)} : 1嚗迤撣??啣虜嚗;

    } else if (stats.normal > 0) {

      ratioText = "比例";

    } else if (stats.abnormal > 0) {

      ratioText = "比例";

    } else {

      ratioText = "撠璅酉";

    }

    rows.push(`<div class="health-stat-row"><span>?? 甇?虜/?啣虜瘥?</span><span class="health-stat-num">${ratioText}</span></div>`);



    for (const key of Object.keys(ABNORMAL_TYPES)) {

      const info = ABNORMAL_TYPES[key];

      const n = stats.byClass[key];

      const isLow = n > 0 && n < MIN_HEALTHY_SAMPLES;

      rows.push(`<div class="health-stat-row${isLow ? " is-warn" : ""}"><span>${info.emoji} ${info.label}</span><span class="health-stat-num">${n} ??{isLow ? " ??" : ""}</span></div>`);

    }

    healthStatList.innerHTML = rows.join("");

  }



  if (healthWarnList) {

    if (stats.warnings.length === 0) {

      healthWarnList.innerHTML = `<div class="health-ok-banner">?? 璅??賊??絲靘?蝞摨瘀??臭誑蝜潛??臬??/div>`;

    } else {

      healthWarnList.innerHTML = stats.warnings.map(w => `<div class="health-warn-item">?? ${w}</div>`).join("");

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



// ?曉之?∪?????

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



// Shift+暺???獢之撠???敶梢?臬 YOLO ?????獢??瘀?px嚗?

pointBoxBtns.forEach(btn => {

  btn.addEventListener("click", () => {

    const px = parseFloat(btn.dataset.box) || DEFAULT_POINT_BOX_PX;

    setPointBoxPx(px);

  });

});



function setPointBoxPx(px) {

  currentPointBoxPx = Math.max(4, Math.min(200, px));

  pointBoxBtns.forEach(b => {

    b.classList.toggle("is-active", Math.abs(parseFloat(b.dataset.box) - currentPointBoxPx) < 0.1);

  });

}



prevPhotoBtn.addEventListener("click", () => {

  if (currentPhotoIndex > 0) showPhoto(currentPhotoIndex - 1);

});

nextPhotoBtn.addEventListener("click", () => {

  if (currentPhotoIndex < photos.length - 1) showPhoto(currentPhotoIndex + 1);

});

sidebarClearAll.addEventListener("click", clearAllPhotos);



// =================== 敶勗?隤踵瞈暸 (鈭桀漲/撠?/?喳?/撠?憓撥/?身) ===================

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



  // 1. ??撱箇????<style id="live-filter-style">嚗誑?擃??閬??????潦之???豢筑?曉之??

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



  // 2. ?郊?湔 photosContainer CSS 霈??inline style

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

showToast("訊息顯示");

  });

}



if (btnSharpen) {

  btnSharpen.addEventListener("click", () => {

    btnSharpen.classList.toggle("is-active");

    if (photosContainer) photosContainer.classList.toggle("is-sharpen", btnSharpen.classList.contains("is-active"));

    applyFilters();

    showToast(btnSharpen.classList.contains("is-active") ? "??撌脤???擃?蝺??? : "撌脤????);

  });

}



if (btnClahe) {

  btnClahe.addEventListener("click", () => {

    btnClahe.classList.toggle("is-active");

    if (photosContainer) photosContainer.classList.toggle("is-clahe", btnClahe.classList.contains("is-active"));

    applyFilters();

    showToast(btnClahe.classList.contains("is-active") ? "?? 撌脤???瘥?撘? : "撌脤???瘥?撘?);

  });

}



// AI ?單??刻? (Tailscale / API)

if (btnAiPredict) {

  btnAiPredict.addEventListener("click", runAiPrediction);

}



async function runAiPrediction() {

  if (photos.length === 0) {

    showToast("隢?銝?抒?");

    return;

  }

  const currentPhoto = photos[currentPhotoIndex];

  if (!currentPhoto || currentPhoto.tiles.length === 0) return;



  const endpoint = (apiEndpointInput && apiEndpointInput.value.trim()) || "http://localhost:8000/predict";

  const threshold = (anomalyThresholdInput && parseFloat(anomalyThresholdInput.value)) || 0.5;



  showLoading(`甇??? Tailscale API ????刻? (${currentPhoto.fileName})?圳);



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

      throw new Error(`?⊥??????${endpoint}??蝣箄?敺垢撌脣??? Tailscale IP 甇?Ⅱ?);

    });



    clearTimeout(timeoutId);



    if (!response.ok) {

      throw new Error(`隡箸??典??隤斤Ⅳ: ${response.status}`);

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



    showToast(`AI ?刻?摰?嚗???${abnormalCount} ?撣豢嚗擗身?箸迤撣節);

    updateSummary();



  } catch (err) {

    console.warn("AI Prediction notice:", err);

    showToast(err.message || "?刻????憭望?嚗?瑼Ｘ API 閮剖?");

  } finally {

    hideLoading();

  }

}



showPhoto(0);



// ?憛蝯??菜葫嚗??曌?/ 閫豢?虜璅??蝒閬???

document.addEventListener("pointerup", stopPainting);

document.addEventListener("pointercancel", stopPainting);

window.addEventListener("blur", stopPainting);

document.addEventListener("pointermove", (ev) => {

  if (ev.buttons === 0 && isPainting) {

    stopPainting();

  }

});



// 敹恍??銵?(Q/W/E/R/T 撠? 5 蝔桃撣賊???

const KEY_TO_ABNORMAL_TYPE = {

  q: "mite", Q: "mite",

  w: "dwv", W: "dwv",

  e: "debris", E: "debris",

  r: "dead", R: "dead",

  t: "other", T: "other"

};



// ?萇敹急?蛛?

// 1. ?典?嚗? / A 銝?撘萸? / D 銝?撘萸 銝?菔身?芣??箸迤撣詻/W/E/R/T ???啣虜憿

// 2. 皜豢???澆?銝?嚗?

//    - 1=甇?虜

//    - 2=?嗅??詨??撣?

//    - Q/W/E/R/T=?湔閮剔閰脩摰撣賊??伐?

//    - 0/Backspace=皜

document.addEventListener("keydown", (e) => {

  const tag = document.activeElement && document.activeElement.tagName;

  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;



  // A: Ctrl+Z ?日 / Ctrl+Y ??

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



  // J: F ?萄???文??芣芋撘?

  if (e.key === "f" || e.key === "F") {

    if (!e.ctrlKey && !e.metaKey) {

      e.preventDefault();

      keyboardNavActive = !keyboardNavActive;

      if (keyboardNavActive) {

        const cp = photos[currentPhotoIndex];

        if (cp && cp.tiles.length > 0) {

          focusedTileIndex = 0;

          updateTileFocus(cp);

          showToast("?剁? ?萇撠撌脤??????冽?蝘餃?嚗?/2/0 璅?");

        }

      } else {

        clearTileFocus();

showToast("訊息顯示");

      }

      return;

    }

  }



  // J: ?孵??萄??芸???

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

      // 霈暺蝑? hoveredTileRecord嚗見 1/2/0 敹急?萄隞亦?交?雿?

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



  // 瑼Ｘ?臬??Q/W/E/R/T ??

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

    // 皜豢?銝?澆?銝?嚗/W/E/R/T ??撌血?詨??撣賊???

    e.preventDefault();

    selectAbnormalType(matchedType);

  }

});



// ?亙歇??閮銝?敹??唳??????嚗歲?箇汗?函Ⅱ隤?蝷?

window.addEventListener("beforeunload", (e) => {

  if (!allTiles().some(t => t.state !== "unlabeled")) return;

  e.preventDefault();

  e.returnValue = "";

});



function stopPainting() {

  isPainting = false;

  paintState = null;

}



// J: ?萇撠頛?賣

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

  showLoading(`???抒?銝?(0/${files.length})`);



  try {

    for (let i = 0; i < files.length; i++) {

      updateLoadingText(`???抒?銝?(${i + 1}/${files.length})嚗?{escapeForToast(files[i].name)}`);

      await nextFrame(); // 霈脣漲????箔?嚗??脰??郊???潮?蝞?

      try {

        await addPhoto(files[i], rows, cols, overlap);

      } catch (err) {

        console.error(err);

        showToast(`??{files[i].name}???仃??撌脩?);

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



  // I: 靽????? Blob 靘?隞賢??

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

        marks: [],

        photoName: baseName

      };

      photo.tiles.push(tileRecord);

    }

  }



  // --- ?湔?蝮桀? ---

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

 * 靘?tileRecord 撱箇??桐??澆? DOM ??嚗????瑯hift+暺?/?蝎曄Ⅱ璅酉??

 * ?豢筑?曉之?～遝頛芾矽?游?蝑???隞嗥??冽迨蝬?嚗?

 * 靘銝?抒???IndexedDB ???梁嚗Ⅱ靽??箔??氬?

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



  // ?舀 Shift+??芰?急?嚗票?隞嗅祕?之撠?嚗hift+?桃?暺???摰偕撖詨翰?獢?

  // 銝? Shift ?銝?砍????/ ???憛

  tileEl.addEventListener("pointerdown", (ev) => {

    if (ev.pointerType === "mouse" && ev.button !== 0) return;



    if (ev.shiftKey) {

      startDragAnnotation(tileRecord, tileEl, ev, tileEl);

      return;

    }



    if (ev.pointerType !== "touch") ev.preventDefault();

    // 銝?砍暺????憛

    const next = cycleTile(tileRecord, tileEl);

    isPainting = true;

    paintState = next;

    updateSummary();

  });

  tileEl.addEventListener("pointerenter", (ev) => {

    // ?湔瑼Ｘ嚗?皛?撌阡蝣箏祕?? (ev.buttons === 1) ?????憛嚗甇Ｗ蝝??炊??

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

    if (zoomLocked) return; // ?曉之?⊿?摰葉嚗?曌??隞摮??嗉粥?曉之?∪摰?

    cancelHideZoomPreview();

    hoveredTileRecord = tileRecord;

    showZoomPreview(imgEl.src, tileRecord);

  });

  tileEl.addEventListener("mousemove", (ev) => {

    if (zoomLocked) return; // ??銝凋?????曌宏??蝵殷?霈蝙?刻蝛拙?蝘駁??駁???

    positionZoomPreview(ev);

  });

  tileEl.addEventListener("mouseleave", () => {

    if (zoomLocked) return; // ??銝剖蕭?仿??隞塚??踹??曉之?∟◤???

    // 撱園?梯?嚗?皛????宏?唳憭折銝嚗?曉之敶勗?蝎曄Ⅱ??

    scheduleHideZoomPreview();

  });



  // 皛曇憚?湔隤踵?曉之?∪?

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

 * 靘?tileRecord.point ?冽摮??怠嚗?蝘駁嚗??脣????移蝣箸?閮???

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

  marker.title = `蝎曄Ⅱ璅酉?????摨扳? ${tileRecord.point.origX}, ${tileRecord.point.origY}嚗???${Math.round(boxW)}?${Math.round(boxH)}px嚗hift+??舫??唳??貊???`;

  marker.innerHTML = `<span class="point-ring"></span><span class="point-pin">??</span>`;

  tileEl.appendChild(marker);

  tileEl.appendChild(buildPointBoxOutline(tileRecord));

}



/**

 * 靘?tileRecord.point ?祕?祝擃?Shift+??怠?敶ｇ??翰?????箏??寞?嚗?

 * ?怠??箏 YOLO / mask ????蝭?嚗?雿輻??湔?獢之撠?敶Ｙ??臬????

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

 * 撱箇??抒??雯??DOM ?憛?撌血皜???

 * photo.tiles 敹?撌脣?憒伐???blob嚗?甇文撘?鋆遣蝻箏???tileEl 銝衣?鋆?Ｕ?

 * 靘銝?抒? (addPhoto) ??IndexedDB ?芸??? (rebuildPhotoFromStored) ?梁??

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

  heading.textContent = `${photo.fileName}?(${W}?${H}嚗???${rows}?${cols} = ${rows * cols} ??`;

  head.appendChild(heading);



  const actions = document.createElement("div");

  actions.className = "photo-actions";

  const markNormalBtn = document.createElement("button");

  markNormalBtn.type = "button";

  markNormalBtn.className = "mini-btn";

markNormalBtn.textContent = "標為正常";

markNormalBtn.title = "標為正常";

  markNormalBtn.addEventListener("click", () => markPhotoAllNormal(photo));

  const resetBtn = document.createElement("button");

  resetBtn.type = "button";

  resetBtn.className = "mini-btn mini-btn-danger";

  resetBtn.textContent = "皜璅?";

resetBtn.title = "重設";

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



  // --- ?湔?? ---

  const li = document.createElement("li");

  li.className = "sidebar-item";

  li.innerHTML = `

    <img class="sidebar-thumb" src="${photo.thumbUrl || ""}" alt="">

    <div class="sidebar-info">

      <div class="sidebar-name">${escapeHtml(photo.fileName)}</div>

      <div class="sidebar-progress" data-role="progress">0 / ${rows * cols} 撌脫?</div>

    </div>

    <button class="sidebar-remove" title="蝘駁?撐?抒?" aria-label="蝘駁">??/button>

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

    if (labeled > 0 && !confirm(`??{photo.fileName}?歇蝬?閮? ${labeled} ?潘?蝣箏?閬宏?日撐?抒?銝行璉?璅???`)) {

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

 * ??IndexedDB ??????撱箔?撘萇???急?????blob????蝎曄Ⅱ暺???

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

    if (!t.blob) continue; // 瘝?敶勗?鞈????潛瘜????仿?

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

      marks: t.marks || [],

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

  const oldMarks = tileRecord.marks ? [...tileRecord.marks] : [];

  // newPointData === undefined 銵函內?窒?冽??point ?摩??

  //   - ?ａ? abnormal ????芸?皜璅?暺?

  //   - ?園???銝雁???祉? point 銝?

  // newPointData 憿臬??喳?拐辣??null ??隞亥府?潛皞??冽 Shift+暺? / ?臬??嚗?

  let finalPoint, finalMarks;

  if (newPointData !== undefined) {

    if (newPointData && newPointData.marks) {

        finalPoint = newPointData.point;

        finalMarks = newPointData.marks;

    } else {

        finalPoint = newPointData;

        finalMarks = finalPoint ? oldMarks.concat(finalPoint) : [];

    }

  } else if (state !== "abnormal") {

    finalPoint = null;

    finalMarks = [];

  } else {

    finalPoint = oldPoint;

    finalMarks = oldMarks;

  }



  if (!skipUndo) {

    undoStack.push({

      tile: tileRecord,

      oldState: tileRecord.state,

      oldAbnormalType: tileRecord.abnormalType,

      oldPoint,

      oldMarks,

      newState: state,

      newAbnormalType: state === "abnormal" ? (tileRecord.abnormalType || currentAbnormalType) : null,

      newPoint: finalPoint,

      newMarks: finalMarks

    });

    if (undoStack.length > MAX_UNDO) undoStack.shift();

    redoStack.length = 0; // ?啣?雿?蝛?redo

  }

  tileRecord.state = state;

  tileEl.dataset.state = state;

  if (state === "abnormal") {

    if (!tileRecord.abnormalType) tileRecord.abnormalType = currentAbnormalType;

  } else {

    tileRecord.abnormalType = null;

  }

  tileRecord.point = finalPoint || null;

  tileRecord.marks = finalMarks || [];

  renderPointMarker(tileRecord, tileEl);

  updateTileAriaLabel(tileRecord);

}



function performUndo() {

  if (undoStack.length === 0) { showToast("瘝??舀?瑞???"); return; }

  const action = undoStack.pop();

  redoStack.push(action);

  action.tile.state = action.oldState;

  action.tile.abnormalType = action.oldAbnormalType;

  action.tile.point = action.oldPoint || null;

  action.tile.marks = action.oldMarks || [];

  action.tile.el.dataset.state = action.oldState;

  renderPointMarker(action.tile, action.tile.el);

  updateTileAriaLabel(action.tile);

  updateSummary();

showToast("訊息顯示");

}



function performRedo() {

  if (redoStack.length === 0) { showToast("瘝??舫?????"); return; }

  const action = redoStack.pop();

  undoStack.push(action);

  action.tile.state = action.newState;

  action.tile.abnormalType = action.newAbnormalType;

  action.tile.point = action.newPoint || null;

  action.tile.marks = action.newMarks || [];

  action.tile.el.dataset.state = action.newState;

  renderPointMarker(action.tile, action.tile.el);

  updateTileAriaLabel(action.tile);

  updateSummary();

showToast("訊息顯示");

}



function updateTileAriaLabel(tileRecord) {

  let labelText = STATE_LABEL[tileRecord.state];

  if (tileRecord.state === "abnormal" && tileRecord.abnormalType) {

    const typeInfo = ABNORMAL_TYPES[tileRecord.abnormalType] || { label: "?啣虜", emoji: "??" };

    labelText += ` [${typeInfo.emoji} ${typeInfo.label}]`;

  }

  tileRecord.el.setAttribute(

    "aria-label",

    `蝚?${tileRecord.row + 1} ?洵 ${tileRecord.col + 1} 甈????${labelText}`

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

    showToast("?撐?抒?撌脩?瘝??芣??摮?");

  } else {

    showToast(`撌脣? ${changed} ?璅摮身?箸迤撣賂?閮???暺?啣虜?嬋);

  }

  updateSummary();

}



function resetPhotoLabels(photo) {

  const labeled = photo.tiles.filter(t => t.state !== "unlabeled").length;

  if (labeled === 0) return;

  if (!confirm(`蝣箏?閬??扎?{photo.fileName}??? ${labeled} ??閮?嚗)) return;

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

    ? `蝣箏?閬??文??${photos.length} 撘萇??嚗?歇蝬?閮??批捆??雿菟憭晞

    : `蝣箏?閬??文??${photos.length} 撘萇??嚗;

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

    img.onerror = () => reject(new Error(`?⊥?霈????${file.name}`));

    img.src = URL.createObjectURL(file);

  });

}



function escapeHtml(s) {

  const d = document.createElement("div");

  d.textContent = s;

  return d.innerHTML;

}



function escapeForToast(s) {

  return s.length > 40 ? `${s.slice(0, 37)}?圳 : s;

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

    li.textContent = "撠銝?抒?";

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

    if (prog) prog.textContent = `${pLabeled} / ${pTotal} 撌脫?`;

    p.sidebarEl.classList.toggle("is-complete", pLabeled === pTotal && pTotal > 0);

  }



  // C: ?湧??脣漲璇??

  const progressPercent = total > 0 ? Math.round((normal + abnormal) / total * 100) : 0;

  const progressPercentEl = document.getElementById("progress-percent");

  const progressFillEl = document.getElementById("progress-fill");

  if (progressPercentEl) progressPercentEl.textContent = `${progressPercent}%`;

  if (progressFillEl) progressFillEl.style.width = `${progressPercent}%`;



  // ?芸?閫貊?砍?怠??脣? (?脤??港?憭?

  debounceSaveState();

}



// ?Ｙ?蝧餉?鞈?憓撥敶勗?

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



// ?舀 PatchCore / YOLO / JSON 憭瑽????臬

// ?舀 PatchCore / YOLO / JSON 憭瑽????臬

async function doExportDataset(format = "patchcore", splitPercent = 10, shouldAug = false) {

  const tiles = allTiles();

  const normalTiles = tiles.filter(t => t.state === "normal");

  const abnormalTiles = tiles.filter(t => t.state === "abnormal");



  if (normalTiles.length === 0 && abnormalTiles.length === 0) {

showToast("訊息顯示");

    return;

  }



  exportBtn.disabled = true;

  const originalLabel = exportBtn.textContent;

exportBtn.textContent = "匯出資料集";



  try {

    const splitRatio = Math.max(0, Math.min(50, splitPercent)) / 100;



    const CLASS_INDEX = { mite: 0, dwv: 1, debris: 2, dead: 3, other: 4 };

    const CLASS_NAMES = ["mite", "dwv", "debris", "dead", "other"];



    // 撱箇? tile -> ?撅祉??id ???扯”嚗?銝隞乓撘萇??桐??? train / test(val)??

    // ?冽?嚗?銝撘萇???箇??賊?澆?????蝢斤???摨衣隡潘??亙?銝撘萇???澆???

    // ?箇?刻?蝺湧??葫閰?撽?????鞈?瘣拇?嚗蝙閰摯?瘥祕?蝵脫?璅???

    const tilePhotoId = new Map();

    for (const p of photos) {

      for (const t of p.tiles) tilePhotoId.set(t, p.id);

    }



    // 隞交撘萇??桐???甇?虜?潭??靘?箸葫閰?撽??函??抒?嚗?

    // PatchCore ??test/good ??YOLO ??val ?梁???寧??蝣箔??拍車?澆?????頛臭??氬?

    const photosWithNormal = photos.filter(p => p.tiles.some(t => t.state === "normal"));

    const totalNormalCount = photosWithNormal.reduce((sum, p) => sum + p.tiles.filter(t => t.state === "normal").length, 0);

    const targetTestNormalCount = totalNormalCount >= 4 ? Math.max(1, Math.round(totalNormalCount * splitRatio)) : 0;

    const shuffledPhotos = [...photosWithNormal].sort(() => Math.random() - 0.5);

    const testPhotoIds = new Set();

    let accumulatedTestNormal = 0;

    for (const p of shuffledPhotos) {

      if (accumulatedTestNormal >= targetTestNormalCount) break;

      if (testPhotoIds.size >= photosWithNormal.length - 1) break;

      testPhotoIds.add(p.id);

      accumulatedTestNormal += p.tiles.filter(t => t.state === "normal").length;

    }

    const hasHoldoutPhotos = testPhotoIds.size > 0;



    const zip = new JSZip();



    // 1. 匯出 PatchCore 格式

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

      // ?臬?遙雿撣豢?舐 Shift+暺?/?蝎曄Ⅱ璅酉??嚗蔣?蹂???mask 蝎曄Ⅱ摨衣?隤芣???

      let hasPointMasks = false;

      for (const t of abnormalTiles) {

        const subFolder = t.abnormalType ? `abnormal_${t.abnormalType}` : "abnormal";

        pcRoot.folder(`test/${subFolder}`).file(tileFileName(t), t.blob);



        // ??蝝?ground truth mask嚗?蝎曄Ⅱ???摮??券?摨扳??思?????啣虜???

        // 瘝?暺?湔璅?啣虜?摮?靽??唳??湔憛嚗???image-level 璅酉嚗移蝣箏漲頛?嚗?

        if (t.point) hasPointMasks = true;

        const maskBlob = await createMaskBlob(t);

        pcRoot.folder(`test/mask/${subFolder}`).file(maskFileName(t), maskBlob);

      }



      // ???舐?亥? anomalib 雿輻??PatchCore 閮毀閮剖?瑼?class_path/init_args ?舐??anomalib CLI ?身摰撘?

      const usedAbnormalFolders = [...new Set(abnormalTiles.map(t => t.abnormalType ? `abnormal_${t.abnormalType}` : "abnormal"))];

      pcRoot.file("anomalib_patchcore_config.yaml", buildAnomalibConfigYaml(usedAbnormalFolders, hasPointMasks));

    }



    // 2. ?臬 YOLO ?澆? (??data.yaml ??labels/*.txt 摨扳?璅酉)

    if (format === "yolo" || format === "both") {

      const yoloRoot = format === "both" ? zip.folder("yolo_dataset") : zip;



      // data.yaml嚗al 雿輻銝靘撘萇???箇??函?撽???

      // ?抒??訾?頞喃誑??????窒??train 鞈?憭橘???PatchCore ??hasHoldoutPhotos ?斗銝?湛?

      const valImgDir = hasHoldoutPhotos ? "images/val" : "images/train";

      const yamlContent = `path: ./dataset\ntrain: images/train\nval: ${valImgDir}\nnc: 5\nnames: ['mite', 'dwv', 'debris', 'dead', 'other']\n`;

      yoloRoot.file("data.yaml", yamlContent);



      // ?撅斤?銋?YOLO 璅惜????靘?撅祉??? train ??val嚗??撘萇?楊????瘣拇?嚗?

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

            // 蝎曄Ⅱ璅酉嚗誑銝剖?暺皞???Shift+?撖阡?獢?祝擃??翰?????箏??寞?嚗????嚗?蝞???芾澈?迤閬?摨扳?嚗?

            const { w: boxW, h: boxH } = pointBoxDims(t.point);

            const xCenter = clamp01(t.point.normX);

            const yCenter = clamp01(t.point.normY);

            const wNorm = clamp01(boxW / t.w);

            const hNorm = clamp01(boxH / t.h);

            txtLine = `${classId} ${xCenter.toFixed(6)} ${yCenter.toFixed(6)} ${wNorm.toFixed(6)} ${hNorm.toFixed(6)}\n`;

          } else {

            // ?芣?暺?瘝輻??祈澈?迤閬???獢?(蝵桐葉?刻???

            txtLine = `${classId} 0.500000 0.500000 1.000000 1.000000\n`;

          }

          yoloRoot.folder(labelFolder).file(`${base}.txt`, txtLine);

        } else {

          // 甇?虜璅?靽?蝛?txt 瑼誑蝚血? YOLO ?鞎見?祈?蝭?

          yoloRoot.folder(labelFolder).file(`${base}.txt`, "");

        }

      }



      // ?游撐憭批??典??漣璅???YOLO 璅酉瑼?(靘撘萄之??亙? YOLO 閮毀)

      for (const p of photos) {

        const pAbnormals = p.tiles.filter(t => t.state === "abnormal");

        const lines = [];

        for (const t of pAbnormals) {

          const classId = CLASS_INDEX[t.abnormalType] ?? 0;

          let xCenter, yCenter, widthNorm, heightNorm;

          if (t.point) {

            // 蝎曄Ⅱ璅酉嚗誑??蝯???摨扳??箔葉敹???Shift+?撖阡?獢?祝擃??翰?????箏??寞?嚗????

            const { w: boxW, h: boxH } = pointBoxDims(t.point);

            const origX = t.point.origX ?? (t.left + t.point.normX * t.w);

            const origY = t.point.origY ?? (t.top + t.point.normY * t.h);

            xCenter = origX / t.origW;

            yCenter = origY / t.origH;

            widthNorm = clamp01(boxW / t.origW);

            heightNorm = clamp01(boxH / t.origH);

          } else {

            // ?芣?暺?瘝輻?游??潛????粹???

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



    // 3. Classification 鈭?憿撘?

    if (format === "classification" || format === "both") {

      const clsRoot = format === "both" ? zip.folder("classification_dataset") : zip.folder("dataset");

      for (const t of normalTiles) {

        clsRoot.folder("normal").file(tileFileName(t), t.blob);

      }

      for (const t of abnormalTiles) {

        clsRoot.folder("abnormal").file(tileFileName(t), t.blob);

      }

    }



    // I: ???遢

    const shouldBackup = document.getElementById("modal-backup-originals");

    if (shouldBackup && shouldBackup.checked) {

      for (const p of photos) {

        if (p.originalBlob) {

          zip.folder("originals").file(p.fileName, p.originalBlob);

        }

      }

    }



    // G: ?臬蝯梯??梯” Excel (.xlsx)

    if (typeof XLSX !== "undefined") {

      const rows = [];

      const abnormalKeys = Object.keys(ABNORMAL_TYPES);

      for (const p of photos) {

        const pTiles = p.tiles;

        const row = {

          "瑼??迂": p.fileName,

      "Total": pTiles.length,

          "甇?虜": pTiles.filter(t => t.state === "normal").length,

          "?啣虜": pTiles.filter(t => t.state === "abnormal").length,

          "?芣?": pTiles.filter(t => t.state === "unlabeled").length

        };

        for (const key of abnormalKeys) {

          row[ABNORMAL_TYPES[key].label] = pTiles.filter(t => t.state === "abnormal" && t.abnormalType === key).length;

        }

        rows.push(row);

      }

      // ????

      const totalRow = { "瑼??迂": "??" };

      for (const col of Object.keys(rows[0]).filter(k => k !== "瑼??迂")) {

        totalRow[col] = rows.reduce((sum, r) => sum + (r[col] || 0), 0);

      }

      rows.push(totalRow);



      const ws = XLSX.utils.json_to_sheet(rows);

      const wb = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(wb, ws, "璅酉蝯梯?");

      const xlsxData = XLSX.write(wb, { bookType: "xlsx", type: "array" });

      zip.file("report.xlsx", xlsxData);

    }



    // 3. ? JSON 璅酉瑼?(?怎移蝣箏?蝝?甇???漣璅?

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

              box_px: t.point.boxPx || DEFAULT_POINT_BOX_PX, // ???詨捆甈?嚗???max(width_px, height_px)

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

      ? `嚗葫閰?撽????${testPhotoIds.size} 撘萇?

: (photosWithNormal.length > 0 ? " split " : "");

const maskNote = (format === "patchcore" || format === "both") ? " mask " : "";

    showToast(`撌脫????${format.toUpperCase()} 鞈???(甇?虜 ${normalTiles.length}?撣?${abnormalTiles.length} ??{holdoutNote}${maskNote})`);

  } catch (err) {

    console.error(err);

showToast("訊息顯示");

  } finally {

    exportBtn.disabled = (normalTiles.length + abnormalTiles.length) === 0;

    exportBtn.textContent = originalLabel;

  }

}



// F: ?臬?Ｘ?璅酉 JSON

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

        showToast("JSON ?澆?銝迤蝣綽??曆???photos ???");

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

                  // 頛????JSON 瘝? width_px/height_px嚗? box_px ?嗆迤?孵耦??

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

      showToast(`? 撌脣?交?閮鳴????? ${matched} ??{skipped > 0 ? `嚗?{skipped} 撘萇??寥?` : ""}`);

    } catch (err) {

      console.error(err);

showToast("訊息顯示");

    }

    importJsonInput.value = "";

  });

}



// --- ? IndexedDB ?砍撠??芸??怠??Ｗ儔璈 ---

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

        marks: t.marks || [],

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



// ?????炎?乩蒂???怠?嚗祕??撱箇?摮?閮餌???蝎曄Ⅱ璅?暺?

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



showLoading("載入中...");

    await nextFrame();



    let restoredCount = 0;

    for (const pd of data.photos) {

      try {

        await rebuildPhotoFromStored(pd);

        restoredCount++;

      } catch (err) {

console.error("錯誤:", err);

      }

    }



    hideLoading();



    if (restoredCount > 0) {

      showPhoto(0);

      updateSummary();

      showToast(`撌脩?刻????甈∠?璅酉?脣漲嚗?${restoredCount} 撘萇??`);

    }

  } catch (err) {

    console.log("No previous session found.", err);

    hideLoading();

  }

}



checkAndRestoreProject();



// ?曉之?⊥瘚桅?閬賜??辣?脤???塚?霈蝙?刻隞交?皛?敺摮宏?唳憭折銝?

// ?冽?雿?Shift ??亙??曉之?⊥頨怎移蝣粹???暺??????箸?曌?恍?摮停鋡恍???

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



// ?典? Shift ?????? Shift ???曉之?∪????暸???蝎曄Ⅱ??嚗?銝阡＊蝷箸?蝷箏噬蝡?

let shiftKeyActive = false;

function setShiftUIState(active) {

  if (shiftKeyActive === active) return;

  shiftKeyActive = active;

  if (zoomPreviewImgWrap) zoomPreviewImgWrap.classList.toggle("shift-clickable", active);

  if (zoomShiftHint) zoomShiftHint.hidden = !(active && hoveredTileRecord);



  if (active && hoveredTileRecord) {

    // ?? Shift ??摰?＊蝷箇??曉之?∴??批捆??蝵桅?箏?嚗?

    // 霈蝙?刻隞交敹?皛?蝘駁??駁???銝?鋡怠隞摮? hover ???

    cancelHideZoomPreview();

    zoomLocked = true;

  } else if (!active) {

    // ?暸? Shift 敺圾?日?摰??Ｗ儔頝皛? hover ???祈???

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



  // ?冽憭折?憭批蔣?? Shift+?嚗???摮???急????詨?雿蔭嚗?

  // 雿??箇?Ｚ◤?曉之嚗蝙?刻隞交?敺皞Ⅱ嚗蝝?Shift+暺?隞?摰偕撖詨翰?獢?

  zoomPreviewImg.addEventListener("pointerdown", (ev) => {

    if (!ev.shiftKey || !hoveredTileRecord) return;

    if (ev.pointerType === "mouse" && ev.button !== 0) return;

    startDragAnnotation(hoveredTileRecord, zoomPreviewImg, ev, zoomPreviewImgWrap);

  });

}



/**

 * ?梁??Shift+暺?嚗hift+?鈭??摩嚗??澆??祈澈?憭折敶勗??梁嚗?

 * - ??敺?曌宏???Ｗ???DRAG_THRESHOLD_PX嚗蝝???嚗???摰偕撖豢獢?銝剖??喲?????

 * - ??敺??＊?嚗??箄??冽?曌????汗獢??暸???撖阡??蝭??Ｙ??拙耦璅酉??

 * @param {*} tileRecord 閬?閮餌??澆?

 * @param {HTMLElement} coordEl ?其?閮?皛??詨?摨扳???蝝??澆??祈澈嚗??曉之?∠? img嚗?

 * @param {PointerEvent} downEvent pointerdown 鈭辣

 * @param {HTMLElement} previewContainer ???汗獢????啣?捆?剁?? position:relative嚗?撠箏站??coordEl 銝?湛?

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

      // ?桃?暺?嚗???摰偕撖豢獢?銝剖??喲???嚗翰??嚗?

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

 * 靘?normX/normY嚗?~1嚗撠??芾澈嚗????tileRecord 銝蝵桃移蝣箸?閮駁?嚗?

 * ?郊?湔?澆??祈澈?憭折銝剔?閬死璅????澆??湔暺??憭折暺??梁??

 */

function applyPointAnnotation(tileRecord, normX, normY) {

  normX = clamp01(normX);

  normY = clamp01(normY);

  const tileX = normX * tileRecord.w;

  const tileY = normY * tileRecord.h;

  const origX = Math.round(tileRecord.left + tileX);

  const origY = Math.round(tileRecord.top + tileY);



  const newMark = {

    type: currentAbnormalType,

    normX, normY, origX, origY,

    boxPx: currentPointBoxPx,

    widthPx: currentPointBoxPx,

    heightPx: currentPointBoxPx

  };

  setTileState(tileRecord, tileRecord.el, "abnormal", false, {

    point: newMark,

    marks: (tileRecord.marks || []).concat(newMark)

  });

  updateSummary();

  if (hoveredTileRecord === tileRecord) {

    renderZoomPointMarker(tileRecord);

  }

  showToast(`?? 撌脫?閮移蝣粹? (??摨扳? ${origX}, ${origY})嚗??YOLO ??隞交迨?箔葉敹??${currentPointBoxPx}?${currentPointBoxPx}px ??獢?銋隞亦?交?雿?Shift ??怠鞎澆??拐辣憭批??敶Ｘ?`);

}



/**

 * 靘?Shift+??怠?敶Ｙ???x1n/y1n/x2n/y2n嚗??箇撠閰脫摮? 0~1 甇???漣璅?

 * ?Ｙ?蝎曄Ⅱ璅酉嚗祝擃?亙????喳?祕?之撠?銝?撘瑕甇?敶Ｕ?

 * 靘摮?交??唾??曉之?⊥??喳?具?

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

  // boxPx 靽?蝯西???撘Ⅳ嚗?亦摰寧嚗??潮??撖阡??臬銝敺 widthPx/heightPx

  const boxPx = Math.max(widthPx, heightPx);



  const newMark = {

    type: currentAbnormalType,

    normX, normY, origX, origY, boxPx, widthPx, heightPx

  };

  setTileState(tileRecord, tileRecord.el, "abnormal", false, {

    point: newMark,

    marks: (tileRecord.marks || []).concat(newMark)

  });

  updateSummary();

  if (hoveredTileRecord === tileRecord) {

    renderZoomPointMarker(tileRecord);

  }

  showToast(`??撌脫??箇移蝣箇???(??摨扳? ${origX}, ${origY}嚗?{widthPx}?${heightPx}px)嚗OLO ??mask ?賣??湔?∠?祕?之撠);

}



/**

 * ?冽憭折?汗?抒?綽??宏?歹??摮??詨??移蝣箸?閮?嚗靘蹂蝙?刻憭扳撠?蝵柴?

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

  marker.innerHTML = `<span class="point-ring"></span><span class="point-pin">??</span>`;

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

  let statusText = STATE_LABEL[tileRecord.state] || "?芣?";

  if (tileRecord.state === "abnormal" && tileRecord.abnormalType) {

    const typeInfo = ABNORMAL_TYPES[tileRecord.abnormalType] || { label: "?啣虜", emoji: "??" };

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



// mask 瑼??????啣虜?澆?瑼????舀????.png嚗??嫣噶 anomalib 靘???撠??? mask

function maskFileName(t) {

  return tileFileName(t).replace(/\.jpg$/i, ".png");

}



/**

 * ?Ｙ???蝝???ground truth mask嚗撣詨????賬擗?暺?嚗? anomalib ??

 * pixel-level AUROC / 摰?閰摯雿輻嚗偕撖貉?閰脫?臬????t.w ? t.h嚗??氬?

 * - ?移蝣箸?閮鳴?Shift+??怠?拙耦嚗? Shift+暺??摰獢?嚗誑銝剖?暺皞?

 *   靘祕?祝擃銝??交岷??瘥摰?敶Ｘ鞎潸??獢??撖衣隞嗉憚撱??瑕祝瘥?

 * - 瘝?蝎曄Ⅱ璅酉??湔璅?啣虜嚗瘜??亦Ⅱ??蝵殷?靽??唳??湔憛嚗?

 *   pixel-level ??隞??雿移蝣箏漲頛?嚗遣霅啁???Shift+??急???

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

 * ?Ｙ??舐?交??anomalib ?桀? CLI 雿輻??PatchCore 閮毀閮剖?瑼?class_path/init_args ?澆?嚗?

 * 鞈?憭曄?瑽???箇? dataset/嚗? both 璅∪?銝? patchcore_dataset/嚗?train/good?est/good?est/abnormal_*?est/mask/abnormal_*??

 * ?曉瘥?test/abnormal_* ?賡????? test/mask/abnormal_* ??蝝蝵抬??迨 task 閮剔 segmentation嚗?

 * ?臭誑?湔蝞?pixel-level AUROC嚗ask ?移蝣箏漲閬?閮餅??臬??Shift+??急???嚗?銝閮餉圾嚗?

 * anomalib ?身摰?schema ??隤踵嚗?蝺游?隢??典?鞈???銝甈∠Ⅱ隤?雿?虫??詨捆??

 */

function buildAnomalibConfigYaml(abnormalFolders, hasPointMasks = false) {

  const abnormalDirYaml = abnormalFolders.length > 0

    ? `[${abnormalFolders.map(f => `"${f}"`).join(", ")}]`

: "null";

  const maskDirYaml = abnormalFolders.length > 0

    ? `[${abnormalFolders.map(f => `"test/mask/${f}"`).join(", ")}]`

    : "null";

  const maskNote = abnormalFolders.length === 0

    ? "# ?桀?瘝??啣虜璅?嚗?敺?銝撣豢???啣?箏??雿萇??mask"

    : (hasPointMasks

      ? "# mask"

      : "# other");

  return `# ?梯??寡?璅酉撌亙?芸??Ｙ??瘜?

#   1. ??獢??函?鞈?憭橘???train/?est/嚗雿極雿??

#   2. anomalib train --config anomalib_patchcore_config.yaml

# 甈?撠? anomalib ?桀???Folder datamodule + LightningCLI 閮剖??澆?嚗?

# ?其?摰???anomalib ??航?交?撌桃嚗迤撘?蝺游?撱箄降??閬芋頝?甈∠Ⅱ隤?具?

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





// 計算兩個 bbox (x_center, y_center, w, h) 的 IoU

function calculateIoU(box1, box2) {

  const x1_min = box1[1] - box1[3] / 2;

  const x1_max = box1[1] + box1[3] / 2;

  const y1_min = box1[2] - box1[4] / 2;

  const y1_max = box1[2] + box1[4] / 2;



  const x2_min = box2[1] - box2[3] / 2;

  const x2_max = box2[1] + box2[3] / 2;

  const y2_min = box2[2] - box2[4] / 2;

  const y2_max = box2[2] + box2[4] / 2;



  const intersect_min_x = Math.max(x1_min, x2_min);

  const intersect_min_y = Math.max(y1_min, y2_min);

  const intersect_max_x = Math.min(x1_max, x2_max);

  const intersect_max_y = Math.min(y1_max, y2_max);



  if (intersect_min_x < intersect_max_x && intersect_min_y < intersect_max_y) {

    const intersect_area = (intersect_max_x - intersect_min_x) * (intersect_max_y - intersect_min_y);

    const box1_area = box1[3] * box1[4];

    const box2_area = box2[3] * box2[4];

    return intersect_area / (box1_area + box2_area - intersect_area);

  }

  return 0;

}



// 實作簡單的 NMS 過濾

function applyNMS(boxes, iouThreshold = 0.45) {

  // boxes array of [classId, x_center, y_center, w, h]

  if (!boxes || boxes.length === 0) return [];

  

  const keep = [];

  // 這裡沒有 confidence score，所以依照原本順序或面積稍微排序

  // 為了簡單起見，我們直接遍歷比較

  for (let i = 0; i < boxes.length; i++) {

    const box = boxes[i];

    let drop = false;

    for (let j = 0; j < keep.length; j++) {

      const keepBox = keep[j];

      // 只對同類別做 NMS

      if (box[0] === keepBox[0]) {

        const iou = calculateIoU(box, keepBox);

        if (iou > iouThreshold) {

          drop = true;

          break;

        }

      }

    }

    if (!drop) {

      keep.push(box);

    }

  }

  return keep;

}

