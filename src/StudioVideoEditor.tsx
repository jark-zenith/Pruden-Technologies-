import { useEffect, useRef, useState } from "react";
import { Check, Clapperboard, Download, LoaderCircle, X } from "lucide-react";
import { saveStudioAsset, type StudioAsset } from "./lib/studioLibrary";

export default function StudioVideoEditor({ asset, onClose, onSaved }: { asset: StudioAsset; onClose: () => void; onSaved: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const next = URL.createObjectURL(asset.blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [asset]);

  function loaded() {
    const total = videoRef.current?.duration || 0;
    setDuration(total);
    setEnd(total);
  }

  function seekTo(value: number) {
    if (videoRef.current) videoRef.current.currentTime = value;
  }

  function time(value: number) {
    if (!Number.isFinite(value)) return "00:00";
    return Math.floor(value / 60).toString().padStart(2, "0") + ":" + Math.floor(value % 60).toString().padStart(2, "0");
  }

  async function exportTrim() {
    const video = videoRef.current;
    if (!video || !duration || end <= start || end - start < 0.5) { setError("Choose a valid clip range of at least half a second."); return; }
    const capture = video as HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream };
    const streamFactory = capture.captureStream || capture.mozCaptureStream;
    if (!streamFactory || typeof MediaRecorder === "undefined") {
      setError("This browser cannot export trimmed video from the built-in editor. You can still preview and download the original file.");
      return;
    }
    const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type));
    if (!mimeType) { setError("This browser does not support a compatible WebM export codec."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      video.pause();
      video.currentTime = start;
      await new Promise<void>((resolve) => video.addEventListener("seeked", () => resolve(), { once: true }));
      const stream = streamFactory.call(video);
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];
      const completed = new Promise<Blob>((resolve, reject) => {
        recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
        recorder.onerror = () => reject(new Error("Video capture failed."));
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });
      const stopAtEnd = () => { if (video.currentTime >= end && recorder.state === "recording") { video.pause(); recorder.stop(); } };
      video.addEventListener("timeupdate", stopAtEnd);
      recorder.start(250);
      await video.play();
      const blob = await completed;
      video.removeEventListener("timeupdate", stopAtEnd);
      stream.getTracks().forEach((track) => track.stop());
      if (!blob.size) throw new Error("The trimmed video export was empty.");
      const base = asset.fileName.replace(/\.[^.]+$/, "");
      const file = new File([blob], base + "-trimmed.webm", { type: mimeType });
      await saveStudioAsset(file, "Exports", asset.title + " · Trimmed clip");
      onSaved();
      setMessage("Trimmed clip saved to Studio Exports as a WebM video.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not export the trimmed clip.");
    } finally { setBusy(false); }
  }

  return <div className="studio-editor-backdrop" role="dialog" aria-modal="true" aria-label={"Edit video " + asset.title}>
    <section className="studio-video-editor">
      <header className="studio-editor-header"><div><p className="eyebrow">PRUDEN STUDIOS / VIDEO CUT DESK</p><h2>{asset.title}</h2><small>Manual clip preview and trim · Original remains untouched</small></div><button onClick={onClose} aria-label="Close video editor"><X size={19} /></button></header>
      <div className="studio-video-stage">{url && <video ref={videoRef} src={url} controls playsInline onLoadedMetadata={loaded} onTimeUpdate={(event) => { const current = event.currentTarget.currentTime; const readout = document.getElementById("studio-video-current"); if (readout) readout.textContent = time(current); }} />}</div>
      <div className="studio-video-controls">
        <div className="studio-video-readout"><span>IN <strong>{time(start)}</strong></span><span>OUT <strong>{time(end)}</strong></span><span>DURATION <strong>{time(Math.max(0, end - start))}</strong></span><span>CURRENT <strong id="studio-video-current">00:00</strong></span></div>
        <label>Start point <input type="range" min="0" max={Math.max(0, duration)} step=".1" value={Math.min(start, duration)} onChange={(event) => { const value = Math.min(Number(event.target.value), end - .5); setStart(Math.max(0, value)); seekTo(Math.max(0, value)); }} /></label>
        <label>End point <input type="range" min="0" max={Math.max(0, duration)} step=".1" value={Math.min(end, duration)} onChange={(event) => { const value = Math.max(Number(event.target.value), start + .5); setEnd(Math.min(duration, value)); }} /></label>
        <div className="studio-video-actions"><button className="secondary-button" onClick={() => { if (videoRef.current) setStart(videoRef.current.currentTime); }}><Clapperboard size={14} /> Set IN at playhead</button><button className="secondary-button" onClick={() => { if (videoRef.current) setEnd(videoRef.current.currentTime); }}>Set OUT at playhead</button><button className="primary-button" onClick={() => void exportTrim()} disabled={busy || !duration || end <= start}><Check size={14} /> {busy ? <><LoaderCircle size={14} /> Exporting clip…</> : "Export trimmed clip"}</button><a className="secondary-button" href={url} download={asset.fileName}><Download size={14} /> Original</a></div>
        {message && <p className="studio-video-message">{message}</p>}{error && <p className="studio-editor-error" role="alert">{error}</p>}
        <p className="studio-team-footnote">This first video tool supports one clip and in/out trimming only. It does not yet provide multi-track editing, transitions, titles, audio mixing or colour grading.</p>
      </div>
    </section>
  </div>;
}
