import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Crop, Download, FlipHorizontal, ImagePlus, Layers3, Maximize2, RotateCcw, RotateCw, SlidersHorizontal, Type, X } from "lucide-react";
import { saveStudioAsset, type StudioAsset } from "./lib/studioLibrary";

type Props = { asset: StudioAsset; onClose: () => void; onSaved: () => void };
type CropMode = "Original" | "1:1" | "4:5" | "16:9" | "3:2";

export default function StudioImageEditor({ asset, onClose, onSaved }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [warmth, setWarmth] = useState(0);
  const [blur, setBlur] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [flip, setFlip] = useState(false);
  const [crop, setCrop] = useState<CropMode>("Original");
  const [text, setText] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textSize, setTextSize] = useState(42);
  const [resizeWidth, setResizeWidth] = useState(0);
  const [resizeHeight, setResizeHeight] = useState(0);
  const [overlayName, setOverlayName] = useState("");
  const [overlayOpacity, setOverlayOpacity] = useState(100);
  const [blendMode, setBlendMode] = useState<GlobalCompositeOperation>("source-over");
  const [toolsOpen, setToolsOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const url = URL.createObjectURL(asset.blob);
    const image = new Image();
    image.onload = () => { if (alive) { imageRef.current = image; setResizeWidth(image.naturalWidth); setResizeHeight(image.naturalHeight); draw(); } URL.revokeObjectURL(url); };
    image.onerror = () => { if (alive) setError("This image could not be opened by the browser editor."); URL.revokeObjectURL(url); };
    image.src = url;
    return () => { alive = false; URL.revokeObjectURL(url); };
  }, [asset]);

  function draw() {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas) return;
    const rotated = Math.abs(rotation % 180) === 90;
    let width = rotated ? image.naturalHeight : image.naturalWidth;
    let height = rotated ? image.naturalWidth : image.naturalHeight;
    const maxEdge = 2600;
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale)); height = Math.max(1, Math.round(height * scale));
    if (crop !== "Original") {
      const [rw, rh] = crop.split(":").map(Number);
      const target = rw / rh;
      if (width / height > target) width = Math.round(height * target);
      else height = Math.round(width / target);
    }
    if (resizeWidth > 0 && resizeHeight > 0) { width = Math.min(5000, resizeWidth); height = Math.min(5000, resizeHeight); }
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.scale(flip ? -1 : 1, 1);
    const drawWidth = width;
    const drawHeight = height;
    ctx.filter = "brightness(" + brightness + "%) contrast(" + contrast + "%) saturate(" + saturation + "%) sepia(" + warmth + "%) blur(" + blur + "px)";
    ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
    if (overlayRef.current) {
      ctx.save(); ctx.globalAlpha = overlayOpacity / 100; ctx.globalCompositeOperation = blendMode;
      ctx.drawImage(overlayRef.current, 0, 0, width, height); ctx.restore();
    }
    if (text.trim()) {
      ctx.save(); ctx.fillStyle = textColor; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.font = "600 " + Math.max(12, textSize * scale) + "px Arial, sans-serif";
      ctx.shadowColor = "rgba(0,0,0,.7)"; ctx.shadowBlur = 5;
      ctx.fillText(text.slice(0, 160), width / 2, height - Math.max(20, 28 * scale), width * .88);
      ctx.restore();
    }
  }

  useEffect(() => { draw(); }, [brightness, contrast, saturation, warmth, blur, rotation, flip, crop, text, textColor, textSize, resizeWidth, resizeHeight, overlayOpacity, blendMode]);

  function loadOverlay(file?: File) {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const overlay = new Image();
    overlay.onload = () => { overlayRef.current = overlay; setOverlayName(file.name); draw(); URL.revokeObjectURL(url); };
    overlay.onerror = () => URL.revokeObjectURL(url);
    overlay.src = url;
  }

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas || saving) return;
    setSaving(true); setError("");
    try {
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not render the edited image.")), "image/png", 0.95));
      const base = asset.fileName.replace(/\.[^.]+$/, "");
      const file = new File([blob], base + "-edited.png", { type: "image/png" });
      await saveStudioAsset(file, "Exports", asset.title + " · Edited");
      onSaved();
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save the edited image."); }
    finally { setSaving(false); }
  }

  function reset() {
    setBrightness(100); setContrast(100); setSaturation(100); setWarmth(0); setBlur(0); setRotation(0); setFlip(false); setCrop("Original"); setText("");
    if (imageRef.current) { setResizeWidth(imageRef.current.naturalWidth); setResizeHeight(imageRef.current.naturalHeight); }
    overlayRef.current = null; setOverlayName(""); setOverlayOpacity(100); setBlendMode("source-over");
  }

  return <div className="studio-editor-backdrop" role="dialog" aria-modal="true" aria-label={"Edit " + asset.title}>
    <section className="studio-editor">
      <header className="studio-editor-header"><div><p className="eyebrow">PRUDEN STUDIOS / MANUAL EDITOR</p><h2>{asset.title}</h2><small>Non-destructive controls · Original file stays in your library</small></div><button onClick={onClose} aria-label="Close editor"><X size={19} /></button></header>
      <div className="studio-editor-layout">
        <div className="studio-editor-stage"><canvas ref={canvasRef} aria-label="Edited image preview" /><span>LIVE PREVIEW</span><button className="studio-editor-sidebar-toggle" onClick={() => setToolsOpen((value) => !value)}>{toolsOpen ? <ChevronRight size={15} /> : <ChevronLeft size={15} />} {toolsOpen ? "Hide tools" : "Show tools"}</button></div>
        {toolsOpen && <aside className="studio-editor-tools">
          <div className="studio-editor-tool-group"><h3><Crop size={14} /> Photo editing · crop & transform</h3><label>Crop ratio<select value={crop} onChange={(event) => setCrop(event.target.value as CropMode)}><option>Original</option><option>1:1</option><option>4:5</option><option>16:9</option><option>3:2</option></select></label><div className="studio-editor-tool-row"><button onClick={() => setRotation((value) => (value + 270) % 360)}><RotateCcw size={14} /> Rotate left</button><button onClick={() => setRotation((value) => (value + 90) % 360)}><RotateCw size={14} /> Rotate right</button><button onClick={() => setFlip((value) => !value)}><FlipHorizontal size={14} /> Flip</button></div></div>
          <div className="studio-editor-tool-group"><h3><Maximize2 size={14} /> Resize & output dimensions</h3><div className="studio-editor-dimensions"><label>Width (px)<input type="number" min="1" max="5000" value={resizeWidth || ""} onChange={(event) => setResizeWidth(Math.max(1, Math.min(5000, Number(event.target.value))))} /></label><label>Height (px)<input type="number" min="1" max="5000" value={resizeHeight || ""} onChange={(event) => setResizeHeight(Math.max(1, Math.min(5000, Number(event.target.value))))} /></label></div><small>Resizes the rendered output; the source file is preserved.</small></div>
          <div className="studio-editor-tool-group"><h3><SlidersHorizontal size={14} /> Photo retouch & colour</h3>
            <label>Brightness <output>{brightness}%</output><input type="range" min="40" max="180" value={brightness} onChange={(event) => setBrightness(Number(event.target.value))} /></label>
            <label>Contrast <output>{contrast}%</output><input type="range" min="40" max="180" value={contrast} onChange={(event) => setContrast(Number(event.target.value))} /></label>
            <label>Saturation <output>{saturation}%</output><input type="range" min="0" max="200" value={saturation} onChange={(event) => setSaturation(Number(event.target.value))} /></label>
            <label>Warmth <output>{warmth}%</output><input type="range" min="0" max="100" value={warmth} onChange={(event) => setWarmth(Number(event.target.value))} /></label>
            <label>Soft focus <output>{blur}px</output><input type="range" min="0" max="8" step=".5" value={blur} onChange={(event) => setBlur(Number(event.target.value))} /></label>
          </div>
          <div className="studio-editor-tool-group"><h3><Layers3 size={14} /> Layers & compositing</h3><div className="studio-layer-row"><span>01 · Base image</span><b>Visible</b></div><div className="studio-layer-row"><span>02 · {overlayName || "Image overlay"}</span><b>{overlayName ? "Visible" : "Empty"}</b></div><button className="secondary-button studio-layer-add" onClick={() => overlayInput.current?.click()}><ImagePlus size={13} /> Add image layer</button><input ref={overlayInput} type="file" accept="image/*" hidden onChange={(event) => loadOverlay(event.target.files?.[0])} /><label>Layer opacity <output>{overlayOpacity}%</output><input type="range" min="0" max="100" value={overlayOpacity} onChange={(event) => setOverlayOpacity(Number(event.target.value))} /></label><label>Blend mode<select value={blendMode} onChange={(event) => setBlendMode(event.target.value as GlobalCompositeOperation)}><option value="source-over">Normal</option><option value="multiply">Multiply</option><option value="screen">Screen</option><option value="overlay">Overlay</option><option value="darken">Darken</option><option value="lighten">Lighten</option></select></label></div>
          <div className="studio-editor-tool-group"><h3><Type size={14} /> Text & graphic design</h3><input value={text} maxLength={160} onChange={(event) => setText(event.target.value)} placeholder="Add a caption or title…" /><div className="studio-editor-tool-row"><label>Colour<input type="color" value={textColor} onChange={(event) => setTextColor(event.target.value)} /></label><label>Size<input type="range" min="16" max="100" value={textSize} onChange={(event) => setTextSize(Number(event.target.value))} /></label></div></div>
          <details className="studio-editor-tool-group studio-editor-future"><summary>Professional & advanced tools</summary><p>Masking, curves, gradient maps, vector paths, healing brush, clone stamp, liquify, smart selections, perspective warp and batch processing.</p><small>Not implemented yet — these controls remain disabled until their editing engines are added.</small></details>
          <details className="studio-editor-tool-group studio-editor-future"><summary>AI-powered editing <span className="studio-tool-disabled">Disabled</span></summary><p>Background removal, object cleanup, generative fill, upscaling, image variations and semantic selection.</p><small>Disabled until an approved image provider and API configuration are connected.</small></details>
          <div className="studio-editor-footer"><button className="secondary-button" onClick={reset}><RotateCcw size={14} /> Reset</button><button className="primary-button" onClick={() => void save()} disabled={saving}><Check size={14} /> {saving ? "Saving…" : "Save as new export"}</button><button className="secondary-button" onClick={() => { const canvas = canvasRef.current; if (!canvas) return; const anchor = document.createElement("a"); anchor.href = canvas.toDataURL("image/png"); anchor.download = asset.fileName.replace(/\.[^.]+$/, "") + "-edited.png"; anchor.click(); }}><Download size={14} /> Download</button></div>
          {error && <p className="studio-editor-error" role="alert">{error}</p>}
        </aside>
      </div>
    </section>
  </div>;
}
