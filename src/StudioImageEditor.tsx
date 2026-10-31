import { useEffect, useRef, useState } from "react";
import { Check, Crop, Download, FlipHorizontal, RotateCcw, RotateCw, SlidersHorizontal, Type, X } from "lucide-react";
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const url = URL.createObjectURL(asset.blob);
    const image = new Image();
    image.onload = () => { if (alive) { imageRef.current = image; draw(); } URL.revokeObjectURL(url); };
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
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.scale(flip ? -1 : 1, 1);
    const sourceWidth = rotated ? image.naturalHeight : image.naturalWidth;
    const sourceHeight = rotated ? image.naturalWidth : image.naturalHeight;
    const baseScale = Math.min(maxEdge / Math.max(sourceWidth, sourceHeight), 1);
    const drawWidth = image.naturalWidth * baseScale;
    const drawHeight = image.naturalHeight * baseScale;
    ctx.filter = "brightness(" + brightness + "%) contrast(" + contrast + "%) saturate(" + saturation + "%) sepia(" + warmth + "%) blur(" + blur + "px)";
    ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
    if (text.trim()) {
      ctx.save(); ctx.fillStyle = textColor; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.font = "600 " + Math.max(12, textSize * scale) + "px Arial, sans-serif";
      ctx.shadowColor = "rgba(0,0,0,.7)"; ctx.shadowBlur = 5;
      ctx.fillText(text.slice(0, 160), width / 2, height - Math.max(20, 28 * scale), width * .88);
      ctx.restore();
    }
  }

  useEffect(() => { draw(); }, [brightness, contrast, saturation, warmth, blur, rotation, flip, crop, text, textColor, textSize]);

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
  }

  return <div className="studio-editor-backdrop" role="dialog" aria-modal="true" aria-label={"Edit " + asset.title}>
    <section className="studio-editor">
      <header className="studio-editor-header"><div><p className="eyebrow">PRUDEN STUDIOS / MANUAL EDITOR</p><h2>{asset.title}</h2><small>Non-destructive controls · Original file stays in your library</small></div><button onClick={onClose} aria-label="Close editor"><X size={19} /></button></header>
      <div className="studio-editor-layout">
        <div className="studio-editor-stage"><canvas ref={canvasRef} aria-label="Edited image preview" /><span>LIVE PREVIEW</span></div>
        <aside className="studio-editor-tools">
          <div className="studio-editor-tool-group"><h3><Crop size={14} /> Crop & transform</h3><label>Crop ratio<select value={crop} onChange={(event) => setCrop(event.target.value as CropMode)}><option>Original</option><option>1:1</option><option>4:5</option><option>16:9</option><option>3:2</option></select></label><div className="studio-editor-tool-row"><button onClick={() => setRotation((value) => (value + 270) % 360)}><RotateCcw size={14} /> Rotate left</button><button onClick={() => setRotation((value) => (value + 90) % 360)}><RotateCw size={14} /> Rotate right</button><button onClick={() => setFlip((value) => !value)}><FlipHorizontal size={14} /> Flip</button></div></div>
          <div className="studio-editor-tool-group"><h3><SlidersHorizontal size={14} /> Image adjustments</h3>
            <label>Brightness <output>{brightness}%</output><input type="range" min="40" max="180" value={brightness} onChange={(event) => setBrightness(Number(event.target.value))} /></label>
            <label>Contrast <output>{contrast}%</output><input type="range" min="40" max="180" value={contrast} onChange={(event) => setContrast(Number(event.target.value))} /></label>
            <label>Saturation <output>{saturation}%</output><input type="range" min="0" max="200" value={saturation} onChange={(event) => setSaturation(Number(event.target.value))} /></label>
            <label>Warmth <output>{warmth}%</output><input type="range" min="0" max="100" value={warmth} onChange={(event) => setWarmth(Number(event.target.value))} /></label>
            <label>Soft focus <output>{blur}px</output><input type="range" min="0" max="8" step=".5" value={blur} onChange={(event) => setBlur(Number(event.target.value))} /></label>
          </div>
          <div className="studio-editor-tool-group"><h3><Type size={14} /> Text overlay</h3><input value={text} maxLength={160} onChange={(event) => setText(event.target.value)} placeholder="Add a caption or title…" /><div className="studio-editor-tool-row"><label>Colour<input type="color" value={textColor} onChange={(event) => setTextColor(event.target.value)} /></label><label>Size<input type="range" min="16" max="100" value={textSize} onChange={(event) => setTextSize(Number(event.target.value))} /></label></div></div>
          <div className="studio-editor-footer"><button className="secondary-button" onClick={reset}><RotateCcw size={14} /> Reset</button><button className="primary-button" onClick={() => void save()} disabled={saving}><Check size={14} /> {saving ? "Saving…" : "Save as new export"}</button><button className="secondary-button" onClick={() => { const canvas = canvasRef.current; if (!canvas) return; const anchor = document.createElement("a"); anchor.href = canvas.toDataURL("image/png"); anchor.download = asset.fileName.replace(/\.[^.]+$/, "") + "-edited.png"; anchor.click(); }}><Download size={14} /> Download</button></div>
          {error && <p className="studio-editor-error" role="alert">{error}</p>}
        </aside>
      </div>
    </section>
  </div>;
}
