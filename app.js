// 蜂蟹蟎標註工具
// 每張照片依網格切成小格，狀態在「未標 / 正常 / 異常」間循環，
// 匯出時整理成 anomalib 慣用的 dataset/train/test 資料夾格式。

const STATE_CYCLE = ["unlabeled", "normal", "abnormal"];
const STATE_LABEL = { unlabeled: "未標", normal: "正常", abnormal: "異常" };
const MOBILE_QUERY = "(max-width: 760px)";

/**
 * photos: {
 *   id: string,
 *   fileName: string,
 *   blockEl: HTMLElement,
 *   sidebarEl: HTMLElement,
 *   thumbUrl: string,
 *   tiles: {row, col, blob, state, el, photoName}[]
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

const photoInput = document.getElementById("photo-input");
const rowsInput = document.getElementById("rows-input");
const colsInput = document.getElementById("cols-input");
const overlapInput = document.getElementById("overlap-input");
const photosContainer = document.getElementById("photos-container");
const summaryPanel = document.getElementById("summary-panel");
const exportBtn = document.getElementById("export-btn");
const toast = document.getElementById("toast");
const zoomPreview = document.getElementById("zoom-preview");
const zoomPreviewImg = document.getElementById("zoom-preview-img");
const zoomPreviewCaption = document.getElementById("zoom-preview-caption");
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");
const sidebarOpenBtn = document.getElementById("sidebar-open");
const sidebarList = document.getElementById("sidebar-list");
const sidebarCount = document.getElementById("sidebar-count");
const sidebarClearAll = document.getElementById("sidebar-clear-all");
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

photoInput.addEventListener("change", handleFiles);
exportBtn.addEventListener("click", exportDataset);
settingsToggleBtn.addEventListener("click", () => {
  settingsSidebar.classList.toggle("collapsed");
});
settingsCloseBtn.addEventListener("click", () => {
  settingsSidebar.classList.add("collapsed");
});
if (emptyUploadBtn) {
  emptyUploadBtn.addEventListener("click", () => {
    settingsSidebar.classList.remove("collapsed");
    photoInput.click();
  });
}
prevPhotoBtn.addEventListener("click", () => {
  if (currentPhotoIndex > 0) showPhoto(currentPhotoIndex - 1);
});
nextPhotoBtn.addEventListener("click", () => {
  if (currentPhotoIndex < photos.length - 1) showPhoto(currentPhotoIndex + 1);
});
sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  syncSidebarOpenBtn();
});
sidebarOpenBtn.addEventListener("click", () => {
  sidebar.classList.remove("collapsed");
  syncSidebarOpenBtn();
});
sidebarClearAll.addEventListener("click", clearAllPhotos);

// 小螢幕預設收合側欄，避免蓋住主要內容
if (window.matchMedia(MOBILE_QUERY).matches) {
  sidebar.classList.add("collapsed");
}
syncSidebarOpenBtn();
showPhoto(0);

// 拖曳塗刷結束偵測（放開滑鼠 / 觸控、游標離開視窗都要結束）
document.addEventListener("pointerup", stopPainting);
document.addEventListener("pointercancel", stopPainting);
window.addEventListener("blur", stopPainting);

// 鍵盤快捷鍵：
// 1. 滑鼠未停在輸入框時：← / A 上一張、→ / D 下一張
// 2. 滑鼠停在格子上時：1=正常、2=異常、0/Backspace=清除
document.addEventListener("keydown", (e) => {
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;

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
  }

  if (!hoveredTileRecord) return;

  let newState = null;
  if (e.key === "1") newState = "normal";
  else if (e.key === "2") newState = "abnormal";
  else if (e.key === "0" || e.key === "Backspace") newState = "unlabeled";
  if (!newState) return;

  e.preventDefault();
  setTileState(hoveredTileRecord, hoveredTileRecord.el, newState);
  updateSummary();
});

// 若已有標記卻不小心重新整理／關閉分頁，跳出瀏覽器確認提示
window.addEventListener("beforeunload", (e) => {
  if (!allTiles().some(t => t.state !== "unlabeled")) return;
  e.preventDefault();
  e.returnValue = "";
});

function syncSidebarOpenBtn() {
  sidebarOpenBtn.hidden = !sidebar.classList.contains("collapsed");
}

function stopPainting() {
  isPainting = false;
  paintState = null;
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

  const photo = { id: photoId, fileName: file.name, tiles: [] };

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
      const tileRecord = { row: r, col: c, blob, state: "unlabeled", photoName: baseName };
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

      // 單點：循環切換狀態；按住拖曳：把滑過的格子塗成同一個狀態
      tileEl.addEventListener("pointerdown", (ev) => {
        if (ev.pointerType === "mouse" && ev.button !== 0) return;
        if (ev.pointerType !== "touch") ev.preventDefault();
        const next = cycleTile(tileRecord, tileEl);
        isPainting = true;
        paintState = next;
        updateSummary();
      });
      tileEl.addEventListener("pointerenter", () => {
        if (isPainting && paintState) {
          setTileState(tileRecord, tileEl, paintState);
          updateSummary();
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

      grid.appendChild(tileEl);
    }
  }

  photosContainer.appendChild(block);
  photo.blockEl = block;

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
    if (window.matchMedia(MOBILE_QUERY).matches) {
      sidebar.classList.add("collapsed");
      syncSidebarOpenBtn();
    }
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

function setTileState(tileRecord, tileEl, state) {
  tileRecord.state = state;
  tileEl.dataset.state = state;
  updateTileAriaLabel(tileRecord);
}

function updateTileAriaLabel(tileRecord) {
  tileRecord.el.setAttribute(
    "aria-label",
    `第 ${tileRecord.row + 1} 列第 ${tileRecord.col + 1} 欄，狀態：${STATE_LABEL[tileRecord.state]}`
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
  sidebarCount.textContent = photos.length ? `照片（${photos.length}）` : "照片";
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
  const normal = tiles.filter(t => t.state === "normal").length;
  const abnormal = tiles.filter(t => t.state === "abnormal").length;
  const unlabeled = tiles.length - normal - abnormal;

  document.getElementById("count-total").textContent = tiles.length;
  document.getElementById("count-normal").textContent = normal;
  document.getElementById("count-abnormal").textContent = abnormal;
  document.getElementById("count-unlabeled").textContent = unlabeled;

  exportBtn.disabled = (normal + abnormal) === 0;

  for (const photo of photos) {
    const total = photo.tiles.length;
    const labeled = photo.tiles.filter(t => t.state !== "unlabeled").length;
    const progressEl = photo.sidebarEl.querySelector('[data-role="progress"]');
    progressEl.textContent = `${labeled} / ${total} 已標`;
    photo.sidebarEl.classList.toggle("is-complete", labeled === total && total > 0);
  }
}

async function exportDataset() {
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
    // 正常格子自動切一小部分當作 test/good，其餘進 train/good，
    // 符合 anomalib 預期的 train/test 資料夾結構。
    const shuffled = [...normalTiles].sort(() => Math.random() - 0.5);
    const testCount = normalTiles.length >= 5 ? Math.max(1, Math.round(normalTiles.length * 0.1)) : 0;
    const testNormal = shuffled.slice(0, testCount);
    const trainNormal = shuffled.slice(testCount);

    const zip = new JSZip();
    const root = zip.folder("dataset");

    for (const t of trainNormal) {
      root.folder("train/good").file(tileFileName(t), t.blob);
    }
    for (const t of testNormal) {
      root.folder("test/good").file(tileFileName(t), t.blob);
    }
    for (const t of abnormalTiles) {
      root.folder("test/abnormal").file(tileFileName(t), t.blob);
    }

    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mite-dataset-${dateStamp()}.zip`;
    a.click();
    URL.revokeObjectURL(url);

    showToast(`已匯出：train/good ${trainNormal.length}、test/good ${testNormal.length}、test/abnormal ${abnormalTiles.length}`);
  } catch (err) {
    console.error(err);
    showToast("匯出失敗，請再試一次");
  } finally {
    exportBtn.disabled = (normalTiles.length + abnormalTiles.length) === 0;
    exportBtn.textContent = originalLabel;
  }
}

function tileFileName(t) {
  return `${t.photoName}_r${String(t.row).padStart(2, "0")}_c${String(t.col).padStart(2, "0")}.jpg`;
}

function dateStamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function showZoomPreview(src, tileRecord) {
  zoomPreviewImg.src = src;
  zoomPreviewCaption.textContent = `${tileRecord.photoName}_r${String(tileRecord.row).padStart(2, "0")}_c${String(tileRecord.col).padStart(2, "0")}`;
  zoomPreview.hidden = false;
}

function positionZoomPreview(e) {
  const margin = 18;
  const previewW = zoomPreview.offsetWidth || 320;
  const previewH = zoomPreview.offsetHeight || 320;

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
