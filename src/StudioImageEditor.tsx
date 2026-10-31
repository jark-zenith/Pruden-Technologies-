import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Crop, Download, FlipHorizontal, ImagePlus, Layers3, Maximize2, MousePointer2, Paintbrush, Pipette, RotateCcw, RotateCw, SlidersHorizontal, Trash2, Type, X } from "lucide-react";
import { saveStudioAsset, type StudioAsset } from "./lib/studioLibrary";
import "./StudioImageEditor.css";

type Props = { asset: StudioAsset; onClose: () => void; onSaved: () => void };
type Tool = "move" | "crop" | "eraser" | "background";
type Layer = { id: number; name: string; canvas: HTMLCanvasElement; visible: boolean; opacity: number; blend: GlobalCompositeOperation };
type Rect = { x: number; y: number; w: number; h: number };
const makeCanvas = (width: number, height: number) => { const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height; return canvas; };

export default function StudioImageEditor({ asset, onClose, onSaved }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const layersRef = useRef<Layer[]>([]);
  const overlayInput = useRef<HTMLInputElement>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayer, setActiveLayer] = useState(1);
  const [tool, setTool] = useState<Tool>("move");
  const [cropRect, setCropRect] = useState<Rect | null>(null);
  const cropStart = useRef<{ x: number; y: number } | null>(null);
  const [brushSize, setBrushSize] = useState(36);
  const [tolerance, setTolerance] = useState(38);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [warmth, setWarmth] = useState(0);
  const [blur, setBlur] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [flip, setFlip] = useState(false);
  const [text, setText] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textSize, setTextSize] = useState(42);
  const [textX, setTextX] = useState(50);
  const [textY, setTextY] = useState(90);
  const [resizeWidth, setResizeWidth] = useState(0);
  const [resizeHeight, setResizeHeight] = useState(0);
  const [toolsOpen, setToolsOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });

  const syncLayers = useCallback((next: Layer[]) => { layersRef.current = next; setLayers(next); }, []);

  useEffect(() => {
    let alive = true;
    const url = URL.createObjectURL(asset.blob);
    const image = new Image();
    image.onload = () => {
      if (!alive) return;
      const scale = Math.min(1, 5000 / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const base = makeCanvas(width, height);
      base.getContext("2d")?.drawImage(image, 0, 0, width, height);
      baseRef.current = base;
      syncLayers([{ id: 1, name: "Background / Original", canvas: base, visible: true, opacity: 100, blend: "source-over" }]);
      setCanvasSize({ width, height });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => { if (alive) setError("This image could not be opened by the browser editor."); URL.revokeObjectURL(url); };
    image.src = url;
    return () => { alive = false; URL.revokeObjectURL(url); };
  }, [asset, syncLayers]);

  const renderComposite = useCallback((includeGuides = true) => {
    const canvas = canvasRef.current;
    if (!canvas || !layersRef.current.length) return;
    const width = canvasSize.width;
    const height = canvasSize.height;
    const rotated = Math.abs(rotation % 180) === 90;
    let outWidth = rotated ? height : width;
    let outHeight = rotated ? width : height;
    if (resizeWidth > 0) outWidth = Math.min(5000, resizeWidth);
    if (resizeHeight > 0) outHeight = Math.min(5000, resizeHeight);
    canvas.width = outWidth; canvas.height = outHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, outWidth, outHeight);
    ctx.save();
    ctx.translate(outWidth / 2, outHeight / 2);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.scale(flip ? -1 : 1, 1);
    const fit = Math.max(outWidth / width, outHeight / height);
    const drawW = width * fit; const drawH = height * fit;
    for (const layer of layersRef.current) {
      if (!layer.visible) continue;
      ctx.save();
      ctx.globalAlpha = layer.opacity / 100;
      ctx.globalCompositeOperation = layer.blend;
      ctx.filter = "brightness(" + brightness + "%) contrast(" + contrast + "%) saturate(" + saturation + "%) sepia(" + warmth + "%) blur(" + blur + "px)";
      ctx.drawImage(layer.canvas, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    }
    ctx.restore();
    if (text.trim()) {
      ctx.save(); ctx.fillStyle = textColor; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = "600 " + Math.max(12, textSize * Math.min(outWidth / width, outHeight / height)) + "px Arial, sans-serif";
      ctx.shadowColor = "rgba(0,0,0,.7)"; ctx.shadowBlur = 5;
      ctx.fillText(text.slice(0, 160), outWidth * textX / 100, outHeight * textY / 100, outWidth * .9);
      ctx.restore();
    }
    if (cropRect && includeGuides && tool === "crop") {
      ctx.save(); ctx.fillStyle = "#0008"; ctx.fillRect(0, 0, outWidth, outHeight);
      ctx.clearRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.setLineDash([8, 5]);
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h); ctx.restore();
    }
  }, [canvasSize, rotation, flip, brightness, contrast, saturation, warmth, blur, resizeWidth, resizeHeight, text, textColor, textSize, textX, textY, cropRect, tool]);

  useEffect(() => { renderComposite(); }, [renderComposite, layers]);

  function canvasPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: Math.max(0, Math.min(canvas.width, (event.clientX - rect.left) * canvas.width / rect.width)), y: Math.max(0, Math.min(canvas.height, (event.clientY - rect.top) * canvas.height / rect.height)) };
  }
  function activeCanvasPoint(point: { x: number; y: number }) {
    const canvas = canvasRef.current!;
    const sx = canvasSize.width / canvas.width;
    const sy = canvasSize.height / canvas.height;
    return { x: point.x * sx, y: point.y * sy };
  }
  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (tool === "move") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = canvasPoint(event);
    if (tool === "crop") { cropStart.current = point; setCropRect({ x: point.x, y: point.y, w: 1, h: 1 }); }
    if (tool === "eraser") { pointerRef.current = point; eraseStroke(point, point); }
    if (tool === "background") { removeConnectedBackground(activeCanvasPoint(point)); }
  }
  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (tool === "crop" && cropStart.current) {
      const point = canvasPoint(event); const start = cropStart.current;
      setCropRect({ x: Math.min(start.x, point.x), y: Math.min(start.y, point.y), w: Math.abs(point.x - start.x), h: Math.abs(point.y - start.y) });
    }
    if (tool === "eraser" && pointerRef.current) {
      const point = canvasPoint(event); eraseStroke(activeCanvasPoint(pointerRef.current), activeCanvasPoint(point)); pointerRef.current = point; renderComposite();
    }
  }
  function onPointerUp() { cropStart.current = null; pointerRef.current = null; }
  function eraseStroke(from: { x: number; y: number }, to: { x: number; y: number }) {
    const layer = layersRef.current.find((item) => item.id === activeLayer);
    if (!layer) return;
    const ctx = layer.canvas.getContext("2d");
    if (!ctx) return;
    ctx.save(); ctx.globalCompositeOperation = "destination-out"; ctx.lineWidth = brushSize; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke(); ctx.restore();
  }
  function removeConnectedBackground(point: { x: number; y: number }) {
    const layer = layersRef.current.find((item) => item.id === activeLayer);
    if (!layer) return;
    const ctx = layer.canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const image = ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
    const { data, width, height } = image;
    const x0 = Math.floor(point.x); const y0 = Math.floor(point.y);
    if (x0 < 0 || y0 < 0 || x0 >= width || y0 >= height) return;
    const start = (y0 * width + x0) * 4;
    const r0 = data[start], g0 = data[start + 1], b0 = data[start + 2];
    const threshold = tolerance * 3;
    const visited = new Uint8Array(width * height);
    const first = y0 * width + x0;
    const stack = [first];
    visited[first] = 1;
    let removed = 0;
    while (stack.length) {
      const index = stack.pop()!;
      if (visited[index]) continue;
      visited[index] = 1;
      const p = index * 4;
      if (Math.abs(data[p] - r0) + Math.abs(data[p + 1] - g0) + Math.abs(data[p + 2] - b0) > threshold) continue;
      data[p + 3] = 0; removed++;
      const x = index % width; const y = Math.floor(index / width);
      if (x > 0 && !visited[index - 1]) { visited[index - 1] = 1; stack.push(index - 1); }
      if (x < width - 1 && !visited[index + 1]) { visited[index + 1] = 1; stack.push(index + 1); }
      if (y > 0 && !visited[index - width]) { visited[index - width] = 1; stack.push(index - width); }
      if (y < height - 1 && !visited[index + width]) { visited[index + width] = 1; stack.push(index + width); }
    }
    ctx.putImageData(image, 0, 0);
    renderComposite();
    setMessage("Removed " + removed.toLocaleString() + " connected pixels. This colour-based tool is not semantic AI background segmentation.");
  }

  function addLayer(file?: File) {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const canvas = makeCanvas(canvasSize.width, canvasSize.height);
      const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
      const w = image.naturalWidth * scale; const h = image.naturalHeight * scale;
      canvas.getContext("2d")?.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      const id = Math.max(0, ...layersRef.current.map((item) => item.id)) + 1;
      syncLayers([...layersRef.current, { id, name: file.name, canvas, visible: true, opacity: 100, blend: "source-over" }]);
      setActiveLayer(id); URL.revokeObjectURL(url);
    };
    image.onerror = () => { setError("Could not load this image layer."); URL.revokeObjectURL(url); };
    image.src = url;
  }
  function updateLayer(id: number, patch: Partial<Layer>) {
    syncLayers(layersRef.current.map((layer) => layer.id === id ? { ...layer, ...patch } : layer));
  }
  function applyCrop() {
    if (!cropRect || cropRect.w < 8 || cropRect.h < 8) { setError("Draw a larger crop selection on the canvas first."); return; }
    const canvas = canvasRef.current!;
    const scaleX = canvasSize.width / canvas.width; const scaleY = canvasSize.height / canvas.height;
    const sx = Math.round(cropRect.x * scaleX); const sy = Math.round(cropRect.y * scaleY);
    const sw = Math.max(1, Math.round(cropRect.w * scaleX)); const sh = Math.max(1, Math.round(cropRect.h * scaleY));
    const next = layersRef.current.map((layer) => {
      const cropped = makeCanvas(sw, sh);
      cropped.getContext("2d")?.drawImage(layer.canvas, sx, sy, sw, sh, 0, 0, sw, sh);
      return { ...layer, canvas: cropped };
    });
    syncLayers(next); setCanvasSize({ width: sw, height: sh }); setCropRect(null); setTool("move"); setResizeWidth(0); setResizeHeight(0); setMessage("Crop applied to every visible and hidden layer.");
  }
  function rotate(degrees: number) {
    const oldWidth = canvasSize.width, oldHeight = canvasSize.height;
    const nextWidth = Math.abs(degrees) % 180 === 90 ? oldHeight : oldWidth;
    const nextHeight = Math.abs(degrees) % 180 === 90 ? oldWidth : oldHeight;
    const next = layersRef.current.map((layer) => {
      const transformed = makeCanvas(nextWidth, nextHeight);
      const ctx = transformed.getContext("2d")!;
      ctx.translate(nextWidth / 2, nextHeight / 2); ctx.rotate(degrees * Math.PI / 180);
      ctx.drawImage(layer.canvas, -oldWidth / 2, -oldHeight / 2);
      return { ...layer, canvas: transformed };
    });
    syncLayers(next); setCanvasSize({ width: nextWidth, height: nextHeight });
  }
  async function save() {
    const canvas = canvasRef.current;
    if (!canvas || saving) return;
    setSaving(true); setError("");
    try {
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not render the edited image.")), "image/png", .95));
      const base = asset.fileName.replace(/\.[^.]+$/, "");
      await saveStudioAsset(new File([blob], base + "-edited.png", { type: "image/png" }), "Exports", asset.title + " · Edited");
      onSaved(); onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save the edited image."); }
    finally { setSaving(false); }
  }
  function reset() {
    const base = baseRef.current;
    if (base) {
      const fresh = makeCanvas(base.width, base.height);
      const original = new Image();
      const url = URL.createObjectURL(asset.blob);
      original.onload = () => { fresh.getContext("2d")?.drawImage(original, 0, 0, fresh.width, fresh.height); syncLayers([{ id: 1, name: "Background / Original", canvas: fresh, visible: true, opacity: 100, blend: "source-over" }]); setCanvasSize({ width: fresh.width, height: fresh.height }); URL.revokeObjectURL(url); };
      original.src = url;
    }
    setActiveLayer(1); setTool("move"); setCropRect(null); setBrightness(100); setContrast(100); setSaturation(100); setWarmth(0); setBlur(0); setRotation(0); setFlip(false); setText(""); setResizeWidth(0); setResizeHeight(0); setMessage(""); setError("");
  }

  return <div className="studio-editor-backdrop" role="dialog" aria-modal="true" aria-label={"Edit " + asset.title}>
    <section className="studio-editor studio-image-pro-editor">
      <header className="studio-editor-header"><div><p className="eyebrow">PRUDEN STUDIOS / PIXEL WORKSPACE</p><h2>{asset.title}</h2><small>Layer-based raster editing · Original asset is preserved · {canvasSize.width} × {canvasSize.height}px</small></div><button onClick={onClose} aria-label="Close editor"><X size={19}/></button></header>
      <div className="studio-editor-layout">
        <div className="studio-editor-stage studio-image-stage"><div className="studio-image-canvas-wrap"><canvas ref={canvasRef} aria-label="Image editing canvas" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} style={{ cursor: tool === "crop" ? "crosshair" : tool === "eraser" ? "none" : tool === "background" ? "cell" : "default" }}/></div><span>LIVE CANVAS · {tool.toUpperCase()} TOOL</span><button className="studio-editor-sidebar-toggle" onClick={() => setToolsOpen((value) => !value)}>{toolsOpen ? <ChevronRight size={15}/> : <ChevronLeft size={15}/>} {toolsOpen ? "Hide tools" : "Show tools"}</button></div>
        {toolsOpen && <aside className="studio-editor-tools studio-image-tools">
          <div className="studio-editor-tool-group"><h3>CANVAS TOOLS</h3><div className="studio-image-tool-grid">
            <button className={tool === "move" ? "active" : ""} onClick={() => { setTool("move"); setCropRect(null); }}><MousePointer2 size={14}/> Move / preview</button>
            <button className={tool === "crop" ? "active" : ""} onClick={() => { setTool("crop"); setCropRect(null); }}><Crop size={14}/> Crop selection</button>
            <button className={tool === "eraser" ? "active" : ""} onClick={() => setTool("eraser")}><Paintbrush size={14}/> Brush eraser</button>
            <button className={tool === "background" ? "active" : ""} onClick={() => setTool("background")}><Pipette size={14}/> Colour erase</button>
          </div>
          {tool === "crop" && <><p>Drag on the image to select the exact crop area.</p><button className="primary-button" onClick={applyCrop} disabled={!cropRect}>Apply crop to layers</button><button onClick={() => setCropRect(null)}>Clear selection</button></>}
          {tool === "eraser" && <label>Brush diameter <output>{brushSize}px</output><input type="range" min="4" max="240" value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))}/><small>Paint directly on the selected layer to erase to transparency.</small></label>}
          {tool === "background" && <label>Colour tolerance <output>{tolerance}</output><input type="range" min="0" max="120" value={tolerance} onChange={(event) => setTolerance(Number(event.target.value))}/><small>Click a connected background colour on the canvas. This is colour-based removal, not AI subject recognition.</small></label>}
          </div>
          <div className="studio-editor-tool-group"><h3><Layers3 size={14}/> LAYERS ({layers.length})</h3>
            {layers.slice().reverse().map((layer) => <div className={"studio-image-layer " + (activeLayer === layer.id ? "active" : "")} key={layer.id}><button className="studio-image-layer-name" onClick={() => setActiveLayer(layer.id)}>{layer.name}</button><button title={layer.visible ? "Hide layer" : "Show layer"} onClick={() => updateLayer(layer.id, { visible: !layer.visible })}>{layer.visible ? "◉" : "○"}</button><button title="Delete layer" onClick={() => { if (layers.length <= 1) return; const next = layersRef.current.filter((item) => item.id !== layer.id); syncLayers(next); if (activeLayer === layer.id) setActiveLayer(next[0].id); }}><Trash2 size={12}/></button></div>)}
            <button className="secondary-button studio-layer-add" onClick={() => overlayInput.current?.click()}><ImagePlus size={13}/> Add image layer</button><input ref={overlayInput} type="file" accept="image/*" hidden onChange={(event) => { addLayer(event.target.files?.[0]); event.currentTarget.value = ""; }}/>
            {layers.find((item) => item.id === activeLayer) && <><label>Layer opacity <output>{layers.find((item) => item.id === activeLayer)!.opacity}%</output><input type="range" min="0" max="100" value={layers.find((item) => item.id === activeLayer)!.opacity} onChange={(event) => updateLayer(activeLayer, { opacity: Number(event.target.value) })}/><label>Blend mode<select value={layers.find((item) => item.id === activeLayer)!.blend} onChange={(event) => updateLayer(activeLayer, { blend: event.target.value as GlobalCompositeOperation })}><option value="source-over">Normal</option><option value="multiply">Multiply</option><option value="screen">Screen</option><option value="overlay">Overlay</option><option value="darken">Darken</option><option value="lighten">Lighten</option><option value="color-dodge">Color dodge</option><option value="color-burn">Color burn</option><option value="difference">Difference</option></select></label></>}
          </div>
          <div className="studio-editor-tool-group"><h3><Maximize2 size={14}/> TRANSFORM & OUTPUT</h3><div className="studio-editor-tool-row"><button onClick={() => rotate(-90)}><RotateCcw size={13}/> Rotate left</button><button onClick={() => rotate(90)}><RotateCw size={13}/> Rotate right</button><button onClick={() => setFlip((value) => !value)}><FlipHorizontal size={13}/> Flip</button></div><div className="studio-editor-dimensions"><label>Width px<input type="number" min="1" max="5000" value={resizeWidth || ""} onChange={(event) => setResizeWidth(Math.max(0, Math.min(5000, Number(event.target.value))))}/></label><label>Height px<input type="number" min="1" max="5000" value={resizeHeight || ""} onChange={(event) => setResizeHeight(Math.max(0, Math.min(5000, Number(event.target.value))))}/></label></div></div>
          <div className="studio-editor-tool-group"><h3><SlidersHorizontal size={14}/> ADJUSTMENTS & RETOUCH</h3>
            <label>Brightness <output>{brightness}%</output><input type="range" min="40" max="180" value={brightness} onChange={(event) => setBrightness(Number(event.target.value))}/></label>
            <label>Contrast <output>{contrast}%</output><input type="range" min="40" max="180" value={contrast} onChange={(event) => setContrast(Number(event.target.value))}/></label>
            <label>Saturation <output>{saturation}%</output><input type="range" min="0" max="200" value={saturation} onChange={(event) => setSaturation(Number(event.target.value))}/></label>
            <label>Warmth <output>{warmth}%</output><input type="range" min="0" max="100" value={warmth} onChange={(event) => setWarmth(Number(event.target.value))}/></label>
            <label>Blur <output>{blur}px</output><input type="range" min="0" max="8" step=".5" value={blur} onChange={(event) => setBlur(Number(event.target.value))}/></label>
          </div>
          <div className="studio-editor-tool-group"><h3><Type size={14}/> TEXT LAYER</h3><input value={text} maxLength={160} onChange={(event) => setText(event.target.value)} placeholder="Add a caption or title…"/><div className="studio-editor-tool-row"><label>Colour<input type="color" value={textColor} onChange={(event) => setTextColor(event.target.value)}/></label><label>Size<input type="range" min="16" max="180" value={textSize} onChange={(event) => setTextSize(Number(event.target.value))}/></label></div><div className="studio-editor-dimensions"><label>Position X %<input type="number" min="0" max="100" value={textX} onChange={(event) => setTextX(Number(event.target.value))}/></label><label>Position Y %<input type="number" min="0" max="100" value={textY} onChange={(event) => setTextY(Number(event.target.value))}/></label></div></div>
          <div className="studio-editor-footer"><button className="secondary-button" onClick={reset}><RotateCcw size={14}/> Reset</button><button className="primary-button" onClick={() => void save()} disabled={saving}><Check size={14}/> {saving ? "Saving…" : "Save export"}</button><button className="secondary-button" onClick={() => { const canvas = canvasRef.current; if (!canvas) return; const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = asset.fileName.replace(/\.[^.]+$/, "") + "-edited.png"; link.click(); }}><Download size={14}/> Download</button></div>
          {message && <p className="studio-video-message">{message}</p>}{error && <p className="studio-editor-error" role="alert">{error}</p>}
        </aside>}
      </div>
    </section>
  </div>;
}
