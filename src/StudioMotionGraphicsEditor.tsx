import { useCallback, useEffect, useRef, useState } from "react";
import { saveStudioAsset } from "./lib/studioLibrary";
import "./StudioMotionGraphicsEditor.css";
import { Activity, Clapperboard, Download, Film, Layers3, Pause, Play, Plus, RotateCcw, Square, Trash2, X } from "lucide-react";

type MotionLayer = {
  id: number;
  name: string;
  kind: "text" | "shape";
  text: string;
  color: string;
  x: number;
  y: number;
  endX: number;
  endY: number;
  scale: number;
  rotation: number;
  opacity: number;
  start: number;
  end: number;
  easing: "linear" | "ease" | "ease-in" | "ease-out";
};
type Preset = "landscape" | "portrait" | "square";
const dimensions: Record<Preset, [number, number]> = { landscape: [1280, 720], portrait: [720, 1280], square: [1080, 1080] };
const initialLayers: MotionLayer[] = [
  { id: 1, name: "Main title", kind: "text", text: "MAKE IT MOVE", color: "#f3f7ff", x: 50, y: 47, endX: 50, endY: 37, scale: 1, rotation: 0, opacity: 1, start: 0, end: 4, easing: "ease-out" },
  { id: 2, name: "Accent shape", kind: "shape", text: "", color: "#4d9fff", x: 50, y: 62, endX: 50, endY: 57, scale: 1, rotation: 0, opacity: .9, start: .25, end: 4, easing: "ease" }
];

export default function StudioMotionGraphicsEditor({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const [preset, setPreset] = useState<Preset>("landscape");
  const [duration, setDuration] = useState(5);
  const [fps, setFps] = useState(30);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [layers, setLayers] = useState<MotionLayer[]>(initialLayers);
  const [selectedId, setSelectedId] = useState(1);
  const [background, setBackground] = useState("#101b2b");
  const [showSafe, setShowSafe] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selected = layers.find((layer) => layer.id === selectedId) || layers[0];
  const [width, height] = dimensions[preset];

  const draw = useCallback((time: number, guides = showSafe) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const easeValue = (value: number, easing: MotionLayer["easing"]) => {
      const t = Math.max(0, Math.min(1, value));
      if (easing === "ease-in") return t * t;
      if (easing === "ease-out") return 1 - (1 - t) * (1 - t);
      if (easing === "ease") return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      return t;
    };
    layers.forEach((layer) => {
      if (time < layer.start || time > layer.end) return;
      const progress = easeValue((time - layer.start) / Math.max(.001, layer.end - layer.start), layer.easing);
      const x = (layer.x + (layer.endX - layer.x) * progress) / 100 * width;
      const y = (layer.y + (layer.endY - layer.y) * progress) / 100 * height;
      const fadeIn = Math.min(1, (time - layer.start) / .25);
      const fadeOut = Math.min(1, (layer.end - time) / .25);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(layer.rotation * Math.PI / 180);
      ctx.scale(layer.scale, layer.scale);
      ctx.globalAlpha = layer.opacity * Math.max(0, Math.min(1, fadeIn, fadeOut));
      if (layer.kind === "text") {
        ctx.fillStyle = layer.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "700 " + Math.round(width * .065) + "px Arial, sans-serif";
        ctx.shadowColor = "#0008";
        ctx.shadowBlur = 18;
        ctx.fillText(layer.text || "Your title", 0, 0, width * .85);
      } else {
        const side = Math.min(width, height) * .09;
        ctx.fillStyle = layer.color;
        ctx.shadowColor = layer.color + "66";
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.roundRect(-side, -side, side * 2, side * 2, side * .28);
        ctx.fill();
      }
      ctx.restore();
    });
    if (guides) {
      ctx.save();
      ctx.strokeStyle = "#ffffff55";
      ctx.lineWidth = Math.max(1, width / 1000);
      ctx.setLineDash([width / 100, width / 70]);
      ctx.strokeRect(width * .05, height * .05, width * .9, height * .9);
      ctx.setLineDash([]);
      ctx.strokeStyle = "#ffffff22";
      ctx.beginPath(); ctx.moveTo(width / 2, 0); ctx.lineTo(width / 2, height); ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2); ctx.stroke();
      ctx.restore();
    }
  }, [layers, background, width, height, showSafe]);

  useEffect(() => { draw(current); }, [draw, current]);
  useEffect(() => {
    if (!playing || busy) return;
    let previous = performance.now();
    const tick = (now: number) => {
      const delta = (now - previous) / 1000;
      previous = now;
      setCurrent((value) => {
        const next = value + delta;
        if (next >= duration) { setPlaying(false); return 0; }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [playing, duration, busy]);

  function update(patch: Partial<MotionLayer>) {
    setLayers((items) => items.map((layer) => layer.id === selectedId ? { ...layer, ...patch } : layer));
  }
  function addLayer(kind: MotionLayer["kind"]) {
    const id = Math.max(0, ...layers.map((layer) => layer.id)) + 1;
    const layer: MotionLayer = { id, name: kind === "text" ? "New title " + id : "Shape " + id, kind, text: "YOUR TITLE", color: kind === "text" ? "#ffffff" : "#4d9fff", x: 50, y: 50, endX: 50, endY: 42, scale: 1, rotation: 0, opacity: 1, start: 0, end: duration, easing: "ease-out" };
    setLayers((items) => [...items, layer]); setSelectedId(id);
  }
  function downloadPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    draw(current, false);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = "pruden-motion-frame.png"; link.click();
      URL.revokeObjectURL(url);
      draw(current);
    }, "image/png");
  }
  async function exportVideo() {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.captureStream || typeof MediaRecorder === "undefined") {
      setError("This browser does not support canvas video recording. PNG frame export remains available."); return;
    }
    const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type));
    if (!mimeType) { setError("No supported WebM encoder was found in this browser."); return; }
    setBusy(true); setPlaying(false); setError(""); setMessage("");
    const stream = canvas.captureStream(fps);
    let recorder: MediaRecorder | null = null;
    try {
      const chunks: BlobPart[] = [];
      recorder = new MediaRecorder(stream, { mimeType });
      const done = new Promise<Blob>((resolve, reject) => {
        recorder!.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
        recorder!.onerror = () => reject(new Error("Motion render failed."));
        recorder!.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });
      recorder.start();
      const frames = Math.ceil(duration * fps);
      for (let frame = 0; frame <= frames; frame += 1) {
        draw(frame / fps, false);
        await new Promise((resolve) => window.setTimeout(resolve, 1000 / fps));
      }
      recorder.stop();
      const blob = await done;
      const file = new File([blob], "pruden-motion-graphic.webm", { type: mimeType });
      await saveStudioAsset(file, "Exports", "Motion graphic · " + duration + "s");
      onSaved();
      setMessage("Motion graphic exported to Studio Assets → Exports as WebM.");
    } catch (cause) {
      if (recorder?.state === "recording") recorder.stop();
      setError(cause instanceof Error ? cause.message : "Could not export this motion graphic.");
    } finally {
      stream.getTracks().forEach((track) => track.stop());
      setCurrent(0); setBusy(false);
    }
  }

  return <div className="studio-editor-backdrop studio-motion-backdrop" role="dialog" aria-modal="true" aria-label="Animation and motion graphics editor">
    <section className="studio-motion-editor">
      <header className="studio-editor-header"><div><p className="eyebrow">PRUDEN STUDIOS / MOTION DESIGN DESK</p><h2>Animation & Motion Graphics</h2><small>Keyframed titles and shape layers · Browser-rendered WebM output</small></div><button onClick={onClose} aria-label="Close motion editor"><X size={19}/></button></header>
      <div className="studio-motion-layout">
        <main className="studio-motion-stage-column">
          <div className="studio-motion-stage"><canvas ref={canvasRef} width={width} height={height} /></div>
          <div className="studio-motion-transport"><button onClick={() => setPlaying((value) => !value)} disabled={busy}>{playing ? <Pause size={15}/> : <Play size={15}/>} {playing ? "Pause" : "Preview"}</button><button onClick={() => { setPlaying(false); setCurrent(0); }}><RotateCcw size={14}/> Reset</button><span>{current.toFixed(2)}s / {duration.toFixed(1)}s</span><button onClick={downloadPng} disabled={busy}><Download size={14}/> PNG frame</button><button className="primary-button" onClick={() => void exportVideo()} disabled={busy}><Film size={14}/> {busy ? "Rendering…" : "Export WebM"}</button></div>
          <div className="studio-motion-timeline"><div className="studio-motion-timeline-head"><strong><Activity size={14}/> TIMELINE / KEYFRAMES</strong><span>{fps} FPS · {duration}s</span></div><input aria-label="Timeline playhead" type="range" min="0" max={duration} step={1 / fps} value={current} onChange={(event) => { setPlaying(false); setCurrent(Number(event.target.value)); }}/><div className="studio-motion-ruler"><span>00:00</span><span>{(duration / 2).toFixed(1)}s</span><span>{duration.toFixed(1)}s</span></div>{layers.map((layer) => <button key={layer.id} className={"studio-motion-track " + (selectedId === layer.id ? "active" : "")} onClick={() => setSelectedId(layer.id)}><span>{layer.name}</span><i style={{ left: (layer.start / duration * 100) + "%", width: ((layer.end - layer.start) / duration * 100) + "%" }}/><small>{layer.start.toFixed(1)}–{layer.end.toFixed(1)}s</small></button>)}</div>
        </main>
        <aside className="studio-motion-inspector">
          <section><div className="studio-motion-panel-head"><strong><Layers3 size={14}/> LAYERS</strong><div><button onClick={() => addLayer("text")} title="Add text layer"><Plus size={13}/> T</button><button onClick={() => addLayer("shape")} title="Add shape layer"><Square size={13}/></button></div></div>
            {layers.map((layer) => <div key={layer.id} className={"studio-motion-layer " + (selectedId === layer.id ? "active" : "")}><button onClick={() => setSelectedId(layer.id)}>{layer.kind === "text" ? "T" : "◇"} {layer.name}</button><button aria-label={"Delete " + layer.name} onClick={() => { if (layers.length <= 1) return; setLayers((items) => items.filter((item) => item.id !== layer.id)); if (selectedId === layer.id) setSelectedId(layers.find((item) => item.id !== layer.id)!.id); }}><Trash2 size={12}/></button></div>)}
          </section>
          {selected && <section className="studio-motion-properties"><div className="studio-motion-panel-head"><strong>PROPERTY KEYFRAMES</strong><span>{selected.kind.toUpperCase()}</span></div>
            {selected.kind === "text" && <label>Text content<input value={selected.text} onChange={(event) => update({ text: event.target.value, name: event.target.value.slice(0, 20) || "Text layer" })}/></label>}
            <label>Layer colour<input type="color" value={selected.color} onChange={(event) => update({ color: event.target.value })}/></label>
            <div className="studio-motion-two"><label>Start X %<input type="number" min="0" max="100" value={selected.x} onChange={(event) => update({ x: Number(event.target.value) })}/></label><label>End X %<input type="number" min="0" max="100" value={selected.endX} onChange={(event) => update({ endX: Number(event.target.value) })}/></label></div>
            <div className="studio-motion-two"><label>Start Y %<input type="number" min="0" max="100" value={selected.y} onChange={(event) => update({ y: Number(event.target.value) })}/></label><label>End Y %<input type="number" min="0" max="100" value={selected.endY} onChange={(event) => update({ endY: Number(event.target.value) })}/></label></div>
            <label>Scale <input type="range" min=".2" max="3" step=".05" value={selected.scale} onChange={(event) => update({ scale: Number(event.target.value) })}/><output>{selected.scale.toFixed(2)}×</output></label>
            <label>Rotation <input type="range" min="-180" max="180" value={selected.rotation} onChange={(event) => update({ rotation: Number(event.target.value) })}/><output>{selected.rotation}°</output></label>
            <label>Opacity <input type="range" min="0" max="1" step=".01" value={selected.opacity} onChange={(event) => update({ opacity: Number(event.target.value) })}/><output>{Math.round(selected.opacity * 100)}%</output></label>
            <div className="studio-motion-two"><label>In (seconds)<input type="number" min="0" max={duration} step=".1" value={selected.start} onChange={(event) => update({ start: Math.min(Number(event.target.value), selected.end - .1) })}/></label><label>Out (seconds)<input type="number" min=".1" max={duration} step=".1" value={selected.end} onChange={(event) => update({ end: Math.max(Number(event.target.value), selected.start + .1) })}/></label></div>
            <label>Interpolation<select value={selected.easing} onChange={(event) => update({ easing: event.target.value as MotionLayer["easing"] })}><option value="linear">Linear</option><option value="ease">Ease in/out</option><option value="ease-in">Ease in</option><option value="ease-out">Ease out</option></select></label>
          </section>}
          <section className="studio-motion-properties"><div className="studio-motion-panel-head"><strong>COMPOSITION & OUTPUT</strong></div>
            <label>Canvas format<select value={preset} onChange={(event) => setPreset(event.target.value as Preset)}><option value="landscape">Landscape · 16:9 · 1280×720</option><option value="portrait">Portrait · 9:16 · 720×1280</option><option value="square">Square · 1:1 · 1080×1080</option></select></label>
            <label>Duration<input type="number" min="1" max="30" step=".5" value={duration} onChange={(event) => { const next = Math.max(1, Math.min(30, Number(event.target.value))); setDuration(next); setLayers((items) => items.map((layer) => ({ ...layer, end: Math.min(layer.end, next) }))); setCurrent((time) => Math.min(time, next)); }}/></label>
            <label>Frame rate<select value={fps} onChange={(event) => setFps(Number(event.target.value))}><option value="24">24 fps · cinematic</option><option value="30">30 fps · standard</option><option value="60">60 fps · smooth</option></select></label>
            <label>Background<input type="color" value={background} onChange={(event) => setBackground(event.target.value)}/></label>
            <label className="studio-motion-check"><input type="checkbox" checked={showSafe} onChange={(event) => setShowSafe(event.target.checked)}/> Show safe area & centre guides</label>
          </section>
          {error && <p className="studio-editor-error" role="alert">{error}</p>}{message && <p className="studio-video-message">{message}</p>}
        </aside>
      </div>
      <footer className="studio-motion-footer"><span><Clapperboard size={13}/> PRUDEN MOTION · ORIGINAL MEDIA PRESERVED</span><span>{width} × {height} · {layers.length} layers · local rendering</span></footer>
    </section>
  </div>;
}
