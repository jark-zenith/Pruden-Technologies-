import { useEffect, useRef, useState } from "react";
import { AudioLines, Check, Download, RotateCcw, Volume2, X } from "lucide-react";
import { saveStudioAsset, type StudioAsset } from "./lib/studioLibrary";

function encodeWav(buffer: AudioBuffer, start: number, end: number): Blob {
  const sampleRate = buffer.sampleRate;
  const channels = buffer.numberOfChannels;
  const first = Math.max(0, Math.floor(start * sampleRate));
  const last = Math.min(buffer.length, Math.floor(end * sampleRate));
  const frames = Math.max(1, last - first);
  const bytesPerSample = 2;
  const dataSize = frames * channels * bytesPerSample;
  const bytes = new ArrayBuffer(44 + dataSize);
  const view = new DataView(bytes);
  const write = (offset: number, value: string) => { for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i)); };
  write(0, "RIFF"); view.setUint32(4, 36 + dataSize, true); write(8, "WAVE"); write(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true); view.setUint16(34, 16, true); write(36, "data"); view.setUint32(40, dataSize, true);
  let offset = 44;
  const planes = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel));
  for (let frame = first; frame < last; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, planes[channel][frame]));
      view.setInt16(offset, sample < 0 ? sample * 32768 : sample * 32767, true);
      offset += bytesPerSample;
    }
  }
  return new Blob([bytes], { type: "audio/wav" });
}

export default function StudioAudioEditor({ asset, onClose, onSaved }: { asset: StudioAsset; onClose: () => void; onSaved: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [url, setUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [volume, setVolume] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const next = URL.createObjectURL(asset.blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [asset]);

  function formatTime(value: number) {
    if (!Number.isFinite(value)) return "00:00";
    return Math.floor(value / 60).toString().padStart(2, "0") + ":" + Math.floor(value % 60).toString().padStart(2, "0");
  }

  async function exportTrim() {
    if (!duration || end <= start || end - start < .1) { setError("Choose a valid audio range."); return; }
    setBusy(true); setError(""); setMessage("");
    let context: AudioContext | undefined;
    try {
      context = new AudioContext();
      const decoded = await context.decodeAudioData(await asset.blob.arrayBuffer());
      const blob = encodeWav(decoded, start, end);
      const base = asset.fileName.replace(/\.[^.]+$/, "");
      const file = new File([blob], base + "-trimmed.wav", { type: "audio/wav" });
      await saveStudioAsset(file, "Exports", asset.title + " · Trimmed audio");
      onSaved();
      setMessage("Trimmed WAV saved to Studio Exports.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This browser could not decode or export the audio file.");
    } finally {
      await context?.close().catch(() => undefined);
      setBusy(false);
    }
  }

  return <div className="studio-editor-backdrop" role="dialog" aria-modal="true" aria-label={"Edit audio " + asset.title}>
    <section className="studio-audio-editor">
      <header className="studio-editor-header"><div><p className="eyebrow">PRUDEN STUDIOS / AUDIO CUT DESK</p><h2>{asset.title}</h2><small>Audio preview, trim and WAV export · Original remains untouched</small></div><button onClick={onClose} aria-label="Close audio editor"><X size={19}/></button></header>
      <div className="studio-audio-body">
        <div className="studio-audio-art"><AudioLines size={58}/><strong>{asset.fileName}</strong><small>{formatTime(duration)} · {asset.mimeType || "Audio file"}</small></div>
        {url && <audio ref={audioRef} src={url} controls onLoadedMetadata={(event) => { const total = event.currentTarget.duration || 0; setDuration(total); setEnd(total); }} />}
        <div className="studio-audio-range"><div><span>IN <strong>{formatTime(start)}</strong></span><span>OUT <strong>{formatTime(end)}</strong></span><span>LENGTH <strong>{formatTime(Math.max(0, end - start))}</strong></span></div>
          <label>Start point<input type="range" min="0" max={Math.max(0, duration)} step=".01" value={Math.min(start, duration)} onChange={(event) => { const value = Math.min(Number(event.target.value), end - .1); setStart(Math.max(0, value)); if (audioRef.current) audioRef.current.currentTime = Math.max(0, value); }}/></label>
          <label>End point<input type="range" min="0" max={Math.max(0, duration)} step=".01" value={Math.min(end, duration)} onChange={(event) => setEnd(Math.max(start + .1, Math.min(duration, Number(event.target.value))))}/></label>
          <label className="studio-audio-volume"><Volume2 size={14}/> Preview volume <output>{volume}%</output><input type="range" min="0" max="100" value={volume} onChange={(event) => { const value = Number(event.target.value); setVolume(value); if (audioRef.current) audioRef.current.volume = value / 100; }}/></label>
        </div>
        <div className="studio-audio-actions"><button className="secondary-button" onClick={() => { setStart(0); setEnd(duration); if (audioRef.current) audioRef.current.currentTime = 0; }}><RotateCcw size={14}/> Reset range</button><button className="primary-button" onClick={() => void exportTrim()} disabled={busy || !duration || end <= start}><Check size={14}/> {busy ? "Rendering WAV…" : "Export trimmed WAV"}</button><a className="secondary-button" href={url} download={asset.fileName}><Download size={14}/> Original</a></div>
        {message && <p className="studio-video-message">{message}</p>}{error && <p className="studio-editor-error" role="alert">{error}</p>}
        <details className="studio-video-tool-group"><summary>Advanced audio tools</summary><small>Multi-track mixing, EQ, compression, noise reduction, fades, automation and voiceover recording are not implemented yet.</small></details>
      </div>
    </section>
  </div>;
}
