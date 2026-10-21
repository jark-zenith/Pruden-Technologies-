import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Clapperboard, Search, Globe, Youtube, Play, X, Minus, Maximize2, ExternalLink, Grip, AlertCircle, LoaderCircle, PictureInPicture2 } from "lucide-react";
import "./IvyMediaDesk.css";

type SearchKind = "web" | "youtube";
type MediaResult = { title: string; url: string; snippet: string; source?: string; thumbnail?: string; videoId?: string };
type ApiResponse = { results?: MediaResult[]; error?: string; configured?: boolean; providers?: { web: boolean; youtube: boolean } };

export default function IvyMediaDesk() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<SearchKind>("youtube");
  const [results, setResults] = useState<MediaResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [playing, setPlaying] = useState<MediaResult | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [positioned, setPositioned] = useState(false);
  const drag = useRef<{ pointerX: number; pointerY: number; x: number; y: number } | null>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const finishDrag = () => { drag.current = null; };
    const move = (event: PointerEvent) => {
      if (!drag.current || !panelRef.current) return;
      const width = panelRef.current.offsetWidth || 420;
      const height = panelRef.current.offsetHeight || 540;
      const maxX = Math.max(0, window.innerWidth - width - 12);
      const maxY = Math.max(0, window.innerHeight - Math.min(height, 70) - 12);
      setPosition({
        x: Math.max(-maxX, Math.min(0, drag.current.x + event.clientX - drag.current.pointerX)),
        y: Math.max(-maxY, Math.min(0, drag.current.y + event.clientY - drag.current.pointerY)),
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
    };
  }, []);

  async function searchMedia(event?: React.FormEvent) {
    event?.preventDefault();
    const term = query.trim();
    if (term.length < 2) { setError("Enter at least two characters to search."); return; }
    if (term.length > 180) { setError("Keep your search under 180 characters."); return; }
    setBusy(true); setError(""); setNotice(""); setResults([]);
    try {
      const response = await fetch("/api/ivy/media/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: term, kind }),
      });
      const data = await response.json() as ApiResponse;
      if (!response.ok) throw new Error(data.error || `Search failed (HTTP ${response.status}).`);
      setResults(Array.isArray(data.results) ? data.results : []);
      if (!data.results?.length) setNotice(kind === "youtube"
        ? "No videos found. Check your query or YouTube API configuration."
        : "No web results found. Try another phrase.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Search is temporarily unavailable.");
    } finally { setBusy(false); }
  }

  function startDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || !panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    drag.current = { pointerX: event.clientX, pointerY: event.clientY, x: rect.left - (window.innerWidth - rect.width - 18), y: rect.top - (window.innerHeight - rect.height - 18) };
    setPosition({ x: rect.left - (window.innerWidth - rect.width - 18), y: rect.top - (window.innerHeight - rect.height - 18) });
    setPositioned(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  const style = positioned ? { right: 18, bottom: 18, transform: `translate(${position.x}px, ${position.y}px)` } : undefined;

  return <>
    {!open && <button className="ivy-media-launcher" onClick={() => setOpen(true)} aria-label="Open Ivy Media Desk" title="Ivy Media Desk"><Clapperboard size={18} /><span>Media Desk</span></button>}
    {open && <section ref={panelRef} className={`ivy-media-window ${minimized ? "is-minimized" : ""}`} style={style} role="dialog" aria-label="Ivy Media Desk">
      <header className="ivy-media-header">
        <button className="ivy-media-drag" onPointerDown={startDrag} aria-label="Move Media Desk" title="Drag to move"><Grip size={16} /></button>
        <span className="ivy-media-brand"><span className="ivy-media-mark"><Clapperboard size={17} /></span><span><strong>IVY MEDIA DESK</strong><small>Search · Discover · Watch</small></span></span>
        <button className="ivy-media-control" onClick={() => setMinimized((value) => !value)} aria-label={minimized ? "Restore Media Desk" : "Minimize Media Desk"} title={minimized ? "Restore" : "Minimize"}>{minimized ? <Maximize2 size={15} /> : <Minus size={15} />}</button>
        <button className="ivy-media-control" onClick={() => setOpen(false)} aria-label="Close Media Desk" title="Close"><X size={16} /></button>
      </header>
      {!minimized && <>
        <form className="ivy-media-search" onSubmit={(event) => void searchMedia(event)}>
          <label className="ivy-media-searchbox"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={180} placeholder="Search videos, creators, tutorials…" aria-label="Search web or YouTube" /><button type="submit" disabled={busy || query.trim().length < 2} aria-label="Search">{busy ? <LoaderCircle size={16} className="ivy-media-spin" /> : <Search size={16} />}</button></label>
          <div className="ivy-media-tabs" role="tablist" aria-label="Search type">
            <button type="button" role="tab" aria-selected={kind === "youtube"} className={kind === "youtube" ? "active" : ""} onClick={() => { setKind("youtube"); setResults([]); setError(""); setNotice(""); }}><Youtube size={14} /> YouTube</button>
            <button type="button" role="tab" aria-selected={kind === "web"} className={kind === "web" ? "active" : ""} onClick={() => { setKind("web"); setResults([]); setError(""); setNotice(""); }}><Globe size={14} /> Web</button>
          </div>
        </form>
        {error && <div className="ivy-media-message error" role="alert"><AlertCircle size={14} /><span>{error}</span></div>}
        {notice && <div className="ivy-media-message"><Search size={14} /><span>{notice}</span></div>}
        <div className="ivy-media-results" aria-live="polite">
          {busy && <div className="ivy-media-empty"><LoaderCircle size={20} className="ivy-media-spin" /><span>Searching securely…</span></div>}
          {!busy && results.length === 0 && !error && !notice && <div className="ivy-media-empty"><Clapperboard size={25} /><strong>Your media workspace</strong><span>Search public web pages or YouTube videos. Results appear here.</span></div>}
          {!busy && results.map((item) => <article className="ivy-media-result" key={item.url}>
            {kind === "youtube" ? <button className="ivy-media-thumb" onClick={() => { setPlaying(item); setMinimized(false); }} aria-label={`Play ${item.title}`}>{item.thumbnail ? <img src={item.thumbnail} alt="" loading="lazy" /> : <Youtube size={24} />}<span><Play size={16} fill="currentColor" /></span></button> : <span className="ivy-media-web-icon"><Globe size={18} /></span>}
            <div className="ivy-media-result-copy"><strong>{item.title}</strong><small>{item.source || new URL(item.url).hostname}</small><p>{item.snippet}</p><div className="ivy-media-result-actions">{kind === "youtube" && <button onClick={() => { setPlaying(item); setMinimized(false); }}><Play size={12} /> Play here</button>}<a href={item.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={12} /> Open source</a></div></div>
          </article>)}
        </div>
        {playing && <section className="ivy-media-player" aria-label="YouTube mini-player">
          <div className="ivy-media-player-title"><span><PictureInPicture2 size={14} /> NOW PLAYING</span><strong title={playing.title}>{playing.title}</strong><button onClick={() => setPlaying(null)} aria-label="Close video player"><X size={14} /></button></div>
          {playing.videoId ? <iframe src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(playing.videoId)}?autoplay=1&rel=0`} title={playing.title} allow="accelerometer; autoplay; encrypted-media; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen /> : <p>Video ID is unavailable for this result.</p>}
          <div className="ivy-media-player-footer"><span>Playback may be restricted by the video's owner.</span><a href={playing.url} target="_blank" rel="noopener noreferrer">Open YouTube <ExternalLink size={11} /></a></div>
        </section>}
      </>}
    </section>}
  </>;
}
