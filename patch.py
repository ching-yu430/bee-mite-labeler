import re
import sys
import codecs

def patch_file(filepath):
    # Determine encoding and read file
    with open(filepath, 'rb') as f:
        raw = f.read()
    if raw.startswith(codecs.BOM_UTF16_LE):
        encoding = 'utf-16le'
    elif raw.startswith(codecs.BOM_UTF16_BE):
        encoding = 'utf-16be'
    else:
        encoding = 'utf-8'

    with open(filepath, 'r', encoding=encoding) as f:
        content = f.read()

    # 1. Select inputs
    content = content.replace(
        'const zoomLevelBtns = document.querySelectorAll(".zoom-level-btn");',
        'const zoomLevelBtns = document.querySelectorAll(".zoom-level-btn");\nconst zoomLevelSelect = document.getElementById("zoom-level-select");\nif (zoomLevelSelect) zoomLevelSelect.addEventListener("change", (e) => setZoomLevel(parseFloat(e.target.value)));'
    )
    content = content.replace(
        'const pointBoxBtns = document.querySelectorAll(".point-box-btn");',
        'const pointBoxBtns = document.querySelectorAll(".point-box-btn");\nconst pointBoxSelect = document.getElementById("point-box-select");\nif (pointBoxSelect) pointBoxSelect.addEventListener("change", (e) => setPointBoxPx(parseFloat(e.target.value)));'
    )
    
    # 2. Add marks: []
    content = content.replace(
        'point: null,\n        photoName: baseName',
        'point: null,\n        marks: [],\n        photoName: baseName'
    )
    content = content.replace(
        'point: t.point || null,\n      photoName: t.photoName || baseName',
        'point: t.point || null,\n      marks: t.marks || [],\n      photoName: t.photoName || baseName'
    )
    content = content.replace(
        'point: t.point || null,\n        photoName: t.photoName',
        'point: t.point || null,\n        marks: t.marks || [],\n        photoName: t.photoName'
    )

    # 3. setTileState logic
    content = content.replace(
        'const oldPoint = tileRecord.point ? { ...tileRecord.point } : null;',
        'const oldPoint = tileRecord.point ? { ...tileRecord.point } : null;\n  const oldMarks = tileRecord.marks ? [...tileRecord.marks] : [];'
    )
    content = content.replace(
        'let finalPoint;\n  if (newPointData !== undefined) {\n    finalPoint = newPointData;\n  } else if (state !== "abnormal") {\n    finalPoint = null;\n  } else {\n    finalPoint = oldPoint;\n  }',
        '''let finalPoint, finalMarks;
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
  }'''
    )
    content = content.replace(
        '      oldPoint,\n      newState: state,',
        '      oldPoint,\n      oldMarks,\n      newState: state,'
    )
    content = content.replace(
        '      newPoint: finalPoint\n    });',
        '      newPoint: finalPoint,\n      newMarks: finalMarks\n    });'
    )
    content = content.replace(
        'tileRecord.point = finalPoint || null;',
        'tileRecord.point = finalPoint || null;\n  tileRecord.marks = finalMarks || [];'
    )
    content = content.replace(
        'action.tile.point = action.oldPoint || null;',
        'action.tile.point = action.oldPoint || null;\n  action.tile.marks = action.oldMarks || [];'
    )
    content = content.replace(
        'action.tile.point = action.newPoint || null;',
        'action.tile.point = action.newPoint || null;\n  action.tile.marks = action.newMarks || [];'
    )
    
    # 4. Render markers
    content = content.replace(
        '  const old = tileEl.querySelector(".tile-point-marker");\n  if (old) old.remove();\n  const oldBox = tileEl.querySelector(".tile-point-box");\n  if (oldBox) oldBox.remove();\n  if (!tileRecord.point) return;\n  const marker = document.createElement("div");\n  marker.className = "tile-point-marker";\n  marker.style.left = `${(tileRecord.point.normX * 100).toFixed(2)}%`;\n  marker.style.top = `${(tileRecord.point.normY * 100).toFixed(2)}%`;\n  const { w: boxW, h: boxH } = pointBoxDims(tileRecord.point);\n  marker.title = `精確標註區域（原圖座標 ${tileRecord.point.origX}, ${tileRecord.point.origY}，範圍 ${Math.round(boxW)}×${Math.round(boxH)}px；Shift+拖曳可重新框選範圍）`;\n  marker.innerHTML = `<span class="point-ring"></span><span class="point-pin">📍</span>`;\n  tileEl.appendChild(marker);\n  tileEl.appendChild(buildPointBoxOutline(tileRecord));',
        '''  tileEl.querySelectorAll(".tile-point-marker, .tile-point-box").forEach(el => el.remove());
  if (!tileRecord.marks || tileRecord.marks.length === 0) {
      if (tileRecord.point) {
          tileRecord.marks = [tileRecord.point];
      } else {
          return;
      }
  }
  for (const mark of tileRecord.marks) {
      const marker = document.createElement("div");
      marker.className = "tile-point-marker";
      marker.style.left = `${(mark.normX * 100).toFixed(2)}%`;
      marker.style.top = `${(mark.normY * 100).toFixed(2)}%`;
      const { w: boxW, h: boxH } = pointBoxDims(mark);
      marker.title = `精確標註區域（原圖座標 ${mark.origX}, ${mark.origY}，範圍 ${Math.round(boxW)}x${Math.round(boxH)}px；Shift+拖曳可重新框選範圍）`;
      marker.innerHTML = `<span class="point-ring"></span><span class="point-pin">📍</span>`;
      tileEl.appendChild(marker);
      
      const box = document.createElement("div");
      box.className = "tile-point-box";
      box.style.left = `${(mark.normX * 100).toFixed(2)}%`;
      box.style.top = `${(mark.normY * 100).toFixed(2)}%`;
      box.style.width = `${clamp01(boxW / tileRecord.w) * 100}%`;
      box.style.height = `${clamp01(boxH / tileRecord.h) * 100}%`;
      tileEl.appendChild(box);
  }'''
    )
    
    content = content.replace(
        '  const old = zoomPreviewImgWrap.querySelector(".tile-point-marker");\n  if (old) old.remove();\n  const oldBox = zoomPreviewImgWrap.querySelector(".tile-point-box");\n  if (oldBox) oldBox.remove();\n  if (!tileRecord || !tileRecord.point) return;\n  const marker = document.createElement("div");\n  marker.className = "tile-point-marker";\n  marker.style.left = `${(tileRecord.point.normX * 100).toFixed(2)}%`;\n  marker.style.top = `${(tileRecord.point.normY * 100).toFixed(2)}%`;\n  marker.innerHTML = `<span class="point-ring"></span><span class="point-pin">📍</span>`;\n  zoomPreviewImgWrap.appendChild(marker);\n  zoomPreviewImgWrap.appendChild(buildPointBoxOutline(tileRecord));',
        '''  zoomPreviewImgWrap.querySelectorAll(".tile-point-marker, .tile-point-box").forEach(el => el.remove());
  if (!tileRecord || (!tileRecord.marks || tileRecord.marks.length === 0)) return;
  for (const mark of tileRecord.marks) {
      const marker = document.createElement("div");
      marker.className = "tile-point-marker";
      marker.style.left = `${(mark.normX * 100).toFixed(2)}%`;
      marker.style.top = `${(mark.normY * 100).toFixed(2)}%`;
      marker.innerHTML = `<span class="point-ring"></span><span class="point-pin">📍</span>`;
      zoomPreviewImgWrap.appendChild(marker);
      
      const box = document.createElement("div");
      const { w: boxW, h: boxH } = pointBoxDims(mark);
      box.className = "tile-point-box";
      box.style.left = `${(mark.normX * 100).toFixed(2)}%`;
      box.style.top = `${(mark.normY * 100).toFixed(2)}%`;
      box.style.width = `${clamp01(boxW / tileRecord.w) * 100}%`;
      box.style.height = `${clamp01(boxH / tileRecord.h) * 100}%`;
      zoomPreviewImgWrap.appendChild(box);
  }'''
    )
    
    content = content.replace(
        '  setTileState(tileRecord, tileRecord.el, "abnormal", false, {\n    normX, normY, origX, origY,\n    boxPx: currentPointBoxPx,\n    widthPx: currentPointBoxPx,\n    heightPx: currentPointBoxPx\n  });',
        '''  const newMark = {
    type: currentAbnormalType,
    normX, normY, origX, origY,
    boxPx: currentPointBoxPx,
    widthPx: currentPointBoxPx,
    heightPx: currentPointBoxPx
  };
  setTileState(tileRecord, tileRecord.el, "abnormal", false, {
    point: newMark,
    marks: (tileRecord.marks || []).concat(newMark)
  });'''
    )
    
    content = content.replace(
        '  setTileState(tileRecord, tileRecord.el, "abnormal", false, { normX, normY, origX, origY, boxPx, widthPx, heightPx });',
        '''  const newMark = {
    type: currentAbnormalType,
    normX, normY, origX, origY, boxPx, widthPx, heightPx
  };
  setTileState(tileRecord, tileRecord.el, "abnormal", false, {
    point: newMark,
    marks: (tileRecord.marks || []).concat(newMark)
  });'''
    )
    
    nms_code = r'''function calculateIoU(box1, box2) {
  const xLeft = Math.max(box1.xmin, box2.xmin);
  const yTop = Math.max(box1.ymin, box2.ymin);
  const xRight = Math.min(box1.xmax, box2.xmax);
  const yBottom = Math.min(box1.ymax, box2.ymax);
  if (xRight < xLeft || yBottom < yTop) return 0.0;
  const intersectionArea = (xRight - xLeft) * (yBottom - yTop);
  const box1Area = (box1.xmax - box1.xmin) * (box1.ymax - box1.ymin);
  const box2Area = (box2.xmax - box2.xmin) * (box2.ymax - box2.ymin);
  return intersectionArea / (box1Area + box2Area - intersectionArea);
}

function applyNMS(boxes, iouThreshold = 0.45) {
  const result = [];
  const active = new Array(boxes.length).fill(true);
  for (let i = 0; i < boxes.length; i++) {
    if (!active[i]) continue;
    result.push(boxes[i]);
    for (let j = i + 1; j < boxes.length; j++) {
      if (!active[j]) continue;
      if (boxes[i].classId !== boxes[j].classId) continue;
      const iou = calculateIoU(boxes[i], boxes[j]);
      if (iou > iouThreshold) {
        active[j] = false;
      }
    }
  }
  return result;
}

      // 整張大圖在原圖座標下的 YOLO 標註檔 (供整張大圖直接做 YOLO 訓練)
      for (const p of photos) {
        const pAbnormals = p.tiles.filter(t => t.state === "abnormal");
        let allBoxes = [];
        for (const t of pAbnormals) {
          const marksToExport = (t.marks && t.marks.length > 0) ? t.marks : (t.point ? [t.point] : [{ isTile: true }]);
          for (const m of marksToExport) {
            let classId = CLASS_INDEX[m.type || t.abnormalType] ?? 0;
            let xCenter, yCenter, widthNorm, heightNorm, xmin, ymin, xmax, ymax;
            if (!m.isTile) {
              const { w: boxW, h: boxH } = pointBoxDims(m);
              const origX = m.origX ?? (t.left + m.normX * t.w);
              const origY = m.origY ?? (t.top + m.normY * t.h);
              xCenter = origX / t.origW;
              yCenter = origY / t.origH;
              widthNorm = clamp01(boxW / t.origW);
              heightNorm = clamp01(boxH / t.origH);
            } else {
              xCenter = (t.left + t.w / 2) / t.origW;
              yCenter = (t.top + t.h / 2) / t.origH;
              widthNorm = t.w / t.origW;
              heightNorm = t.h / t.origH;
            }
            xmin = xCenter - widthNorm / 2;
            xmax = xCenter + widthNorm / 2;
            ymin = yCenter - heightNorm / 2;
            ymax = yCenter + heightNorm / 2;
            allBoxes.push({ classId, xCenter, yCenter, widthNorm, heightNorm, xmin, xmax, ymin, ymax });
          }
        }
        
        allBoxes = applyNMS(allBoxes, 0.45);
        
        const lines = allBoxes.map(b => `${b.classId} ${b.xCenter.toFixed(6)} ${b.yCenter.toFixed(6)} ${b.widthNorm.toFixed(6)} ${b.heightNorm.toFixed(6)}`);
        yoloRoot.folder("full_image_labels").file(`${p.fileName.replace(/\.[^.]+$/, "")}.txt`, lines.join("\n"));
      }'''
    
    orig_yolo_section = r'''      // 整張大圖在原圖座標下的 YOLO 標註檔 (供整張大圖直接做 YOLO 訓練)
      for (const p of photos) {
        const pAbnormals = p.tiles.filter(t => t.state === "abnormal");
        const lines = [];
        for (const t of pAbnormals) {
          const classId = CLASS_INDEX[t.abnormalType] ?? 0;
          let xCenter, yCenter, widthNorm, heightNorm;
          if (t.point) {
            // 精確標註：以原圖絕對像素座標為中心，用 Shift+拖曳實際框出的寬高（或快速點擊的固定方框）產生邊界框
            const { w: boxW, h: boxH } = pointBoxDims(t.point);
            const origX = t.point.origX ?? (t.left + t.point.normX * t.w);
            const origY = t.point.origY ?? (t.top + t.point.normY * t.h);
            xCenter = origX / t.origW;
            yCenter = origY / t.origH;
            widthNorm = clamp01(boxW / t.origW);
            heightNorm = clamp01(boxH / t.origH);
          } else {
            // 未打點：沿用整個切格範圍作為邊界框
            xCenter = (t.left + t.w / 2) / t.origW;
            yCenter = (t.top + t.h / 2) / t.origH;
            widthNorm = t.w / t.origW;
            heightNorm = t.h / t.origH;
          }
          lines.push(`${classId} ${xCenter.toFixed(6)} ${yCenter.toFixed(6)} ${widthNorm.toFixed(6)} ${heightNorm.toFixed(6)}`);
        }
        yoloRoot.folder("full_image_labels").file(`${p.fileName.replace(/\.[^.]+$/, "")}.txt`, lines.join("\n"));
      }'''
    content = content.replace(orig_yolo_section, nms_code)
    
    orig_tile_yolo = r'''          let txtLine;
          if (t.point) {
            // 精確標註：以中心點為準，用 Shift+拖曳實際框出的寬高（或快速點擊的固定方框）產生邊界框（換算成切格自身的正規化座標）
            const { w: boxW, h: boxH } = pointBoxDims(t.point);
            const xCenter = clamp01(t.point.normX);
            const yCenter = clamp01(t.point.normY);
            const wNorm = clamp01(boxW / t.w);
            const hNorm = clamp01(boxH / t.h);
            txtLine = `${classId} ${xCenter.toFixed(6)} ${yCenter.toFixed(6)} ${wNorm.toFixed(6)} ${hNorm.toFixed(6)}\n`;
          } else {
            // 未打點：沿用切格本身的正規化邊界框 (置中全覆蓋)
            txtLine = `${classId} 0.500000 0.500000 1.000000 1.000000\n`;
          }
          yoloRoot.folder(labelFolder).file(`${base}.txt`, txtLine);'''
          
    new_tile_yolo = r'''          let txtLines = [];
          const marksToExport = (t.marks && t.marks.length > 0) ? t.marks : (t.point ? [t.point] : [{ isTile: true }]);
          for (const m of marksToExport) {
            let mClassId = CLASS_INDEX[m.type || t.abnormalType] ?? classId;
            if (m.isTile) {
              txtLines.push(`${mClassId} 0.500000 0.500000 1.000000 1.000000`);
            } else {
              const { w: boxW, h: boxH } = pointBoxDims(m);
              const xCenter = clamp01(m.normX);
              const yCenter = clamp01(m.normY);
              const wNorm = clamp01(boxW / t.w);
              const hNorm = clamp01(boxH / t.h);
              txtLines.push(`${mClassId} ${xCenter.toFixed(6)} ${yCenter.toFixed(6)} ${wNorm.toFixed(6)} ${hNorm.toFixed(6)}`);
            }
          }
          yoloRoot.folder(labelFolder).file(`${base}.txt`, txtLines.join("\n") + "\n");'''
    content = content.replace(orig_tile_yolo, new_tile_yolo)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

patch_file('c:/Users/su098/OneDrive/桌面/其他東西/bee-mite-labeler/app.js')
