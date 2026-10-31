import { useEffect, useMemo, useRef, useState } from "react";
import { Aperture, ArrowDownToLine, Clapperboard, FileImage, FolderOpen, HardDrive, ImagePlus, Layers3, RefreshCw, Search, ShieldCheck, Trash2, Video, X, Pencil, Plus, Sparkles, Music2, WandSparkles } from "lucide-react";
import { deleteStudioAsset, formatStudioSize, getStudioDirectoryHandle, listStudioAssets, saveStudioAsset, saveStudioDirectoryHandle, writeAssetToStudioFolder, type StudioAsset, type StudioCategory } from "./lib/studioLibrary";
import StudioCreativeTeam from "./StudioCreativeTeam";
import StudioImageEditor from "./StudioImageEditor";
import StudioVideoEditor from "./StudioVideoEditor";
import "./PrudenStudiosPage.css";
import "./PrudenStudiosWorkspace.css";

const categories: StudioCategory[] = ["Photos", "Posters & Designs", "Videos", "Audio & SFX", "VFX & Overlays", "Stock Footage", "Graphics", "Exports"];
type StudioView = "overview" | "edit" | "assets";

export default function PrudenStudiosPage() {
  const [assets, setAssets] = useState<StudioAsset[]>([]);
  const [editingAsset, setEditingAsset] = useState<StudioAsset | null>(null);
  const [editingVideo, setEditingVideo] = useState<StudioAsset | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [category, setCategory] = useState<StudioCategory>("Photos");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [folderName, setFolderName] = useState("");
  const [folderHandle, setFolderHandle] = useState<Awaited<ReturnType<typeof getStudioDirectoryHandle>>>(null);
  const [storage, setStorage] = useState<{ usage?: number; quota?: number }>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState<StudioView>("overview");
  const [newEditMode, setNewEditMode] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const editInput = useRef<HTMLInputElement>(null);

  async function refresh() {
    const rows = await listStudioAssets();
    setAssets(rows);
    if (navigator.storage?.estimate) setStorage(await navigator.storage.estimate());
  }

  useEffect(() => {
    void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load the local library."));
    void getStudioDirectoryHandle().then((handle) => {
      if (handle) { setFolderHandle(handle); setFolderName(handle.name); }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    const urls: Record<string, string> = {};
    assets.forEach((asset) => { if (asset.mimeType.startsWith("image/")) urls[asset.id] = URL.createObjectURL(asset.blob); });
    setPreviewUrls(urls);
    return () => Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
  }, [assets]);

  const filteredAssets = useMemo(() => assets.filter((asset) =>
    (filter === "All" || asset.category === filter) &&
    (asset.title + " " + asset.fileName).toLowerCase().includes(search.toLowerCase())
  ), [assets, filter, search]);

  async function connectFolder() {
    const picker = (window as unknown as { showDirectoryPicker?: (options?: { mode?: "readwrite" }) => Promise<Awaited<ReturnType<typeof getStudioDirectoryHandle>>> }).showDirectoryPicker;
    if (!picker) { setError("Folder linking is not supported in this browser. You can still keep files in the local Studio library and download them."); return; }
    try {
      const handle = await picker({ mode: "readwrite" });
      if (!handle) return;
      setFolderHandle(handle); setFolderName(handle.name);
      await saveStudioDirectoryHandle(handle);
      setMessage("Device folder connected. New imports can be copied into category folders."); setError("");
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "Could not connect the folder.");
    }
  }

  async function importFiles(files: FileList | null, forEditing = false) {
    if (!files?.length) return;
    setBusy(true); setError(""); setMessage("");
    let saved = 0;
    try {
      for (const file of Array.from(files)) {
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");
        const chosenCategory: StudioCategory = forEditing ? (isImage ? "Photos" : "Videos") : category;
        const asset = await saveStudioAsset(file, chosenCategory, file.name.replace(/\.[^.]+$/, ""));
        if (folderHandle) {
          try { await writeAssetToStudioFolder(folderHandle, asset); }
          catch (cause) { setError(cause instanceof Error ? cause.message : "Saved locally, but folder copy failed."); }
        }
        saved += 1;
        if (forEditing && isImage) setEditingAsset(asset);
        if (forEditing && isVideo) setEditingVideo(asset);
      }
      await refresh();
      window.dispatchEvent(new Event("pruden:studio-assets-updated"));
      setMessage(saved + " file(s) added to the local Studio library.");
      if (forEditing) setView("edit");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Import failed.");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
      if (editInput.current) editInput.current.value = "";
      setNewEditMode(false);
    }
  }

  async function exportAsset(asset: StudioAsset) {
    if (folderHandle) {
      try { await writeAssetToStudioFolder(folderHandle, asset); setMessage(asset.fileName + " copied to " + folderName + "/" + asset.category + "."); setError(""); return; }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Folder export failed."); }
    }
    const url = URL.createObjectURL(asset.blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = asset.fileName; anchor.click();
    URL.revokeObjectURL(url);
  }

  async function removeAsset(asset: StudioAsset) {
    if (!window.confirm("Remove " + asset.fileName + " from the Studio browser library? This does not delete a copy already exported to your device folder.")) return;
    await deleteStudioAsset(asset.id); await refresh();
    window.dispatchEvent(new Event("pruden:studio-assets-updated"));
  }

  function openAsset(asset: StudioAsset) {
    if (asset.mimeType.startsWith("image/")) setEditingAsset(asset);
    else if (asset.mimeType.startsWith("video/")) setEditingVideo(asset);
    else setMessage("This asset is stored in your library. A dedicated editor for this file type is not available yet.");
  }

  const totalBytes = assets.reduce((sum, asset) => sum + asset.size, 0);
  const usagePercent = storage.quota ? Math.min(100, Math.round(((storage.usage || 0) / storage.quota) * 100)) : 0;
  const selected = editingAsset || editingVideo;

  return <section className={"module-page studio-page " + (view === "edit" ? "studio-edit-view" : "")}>
    <nav className="studio-workspace-nav" aria-label="Studio workspace">
      <div className="studio-brand-mark"><Aperture size={19} /><strong>PRUDEN <em>STUDIOS</em></strong></div>
      <div className="studio-view-tabs">
        <button className={view === "overview" ? "active" : ""} onClick={() => setView("overview")}>Overview</button>
        <button className={view === "edit" ? "active" : ""} onClick={() => setView("edit")}>Edit</button>
        <button className={view === "assets" ? "active" : ""} onClick={() => setView("assets")}>Assets <span>{assets.length}</span></button>
      </div>
      <button className="primary-button studio-new-edit" onClick={() => { setView("edit"); setNewEditMode(true); editInput.current?.click(); }}><Plus size={15} /> New edit</button>
      <input ref={editInput} type="file" accept="image/*,video/*" hidden onChange={(event) => void importFiles(event.target.files, true)} />
      <input ref={fileInput} type="file" accept="image/*,video/*,audio/*,image/svg+xml,.pdf,.wav,.mp3,.mp4,.webm,.mov" multiple hidden onChange={(event) => void importFiles(event.target.files)} />
    </nav>

    {view === "overview" && <>
      <div className="studio-hero">
        <div className="studio-hero-copy">
          <p className="eyebrow"><span className="studio-live-dot" /> PRUDEN TECHNOLOGIES / CREATIVE DIVISION</p>
          <h1>Make something <em>remarkable.</em></h1>
          <p>A project-first creative workspace for photography, visual design, video production and reusable media assets.</p>
          <div className="studio-hero-actions">
            <button className="primary-button" onClick={() => { setView("edit"); setNewEditMode(true); editInput.current?.click(); }} disabled={busy}><Plus size={16} /> Start new edit</button>
            <button className="secondary-button" onClick={() => { setView("assets"); fileInput.current?.click(); }}><ImagePlus size={15} /> Add assets</button>
            <button className="secondary-button" onClick={connectFolder}><FolderOpen size={15} /> {folderName ? "Change device folder" : "Connect device folder"}</button>
          </div>
          <p className="studio-privacy"><ShieldCheck size={14} /> Files stay in this browser's local Studio library unless you explicitly export them.</p>
        </div>
        <div className="studio-hero-art"><div className="studio-aperture"><Aperture size={76} strokeWidth={1.1} /></div><span>CREATE / CAPTURE / DELIVER</span><small>PRUDEN STUDIOS · EST. 2026</small></div>
      </div>
      <div className="studio-stats">
        <article className="studio-stat"><span><Layers3 size={16} /> LIBRARY ITEMS</span><strong>{String(assets.length).padStart(2, "0")}</strong><small>Local media records</small></article>
        <article className="studio-stat"><span><HardDrive size={16} /> MEDIA SIZE</span><strong>{formatStudioSize(totalBytes)}</strong><small>Files held in browser storage</small></article>
        <article className="studio-stat"><span><FolderOpen size={16} /> DEVICE FOLDER</span><strong className="studio-stat-status">{folderName || "Not linked"}</strong><small>Optional direct folder export</small></article>
      </div>
      <div className="studio-recent-head"><div><p className="eyebrow">RECENT WORK</p><h2>Pick up where you left off</h2></div><button className="text-button" onClick={() => setView("assets")}>Browse all assets →</button></div>
      {assets.slice(0, 6).length ? <div className="studio-asset-grid">{assets.slice(0, 6).map((asset) => <AssetCard key={asset.id} asset={asset} preview={previewUrls[asset.id]} onOpen={() => openAsset(asset)} onExport={() => void exportAsset(asset)} onRemove={() => void removeAsset(asset)} />)}</div> : <div className="studio-empty"><FileImage size={30} /><strong>Your creative workspace is ready</strong><p>Start a new photo or video edit, or add reusable sounds, footage, overlays and graphics to Assets.</p><button className="primary-button" onClick={() => { setView("edit"); editInput.current?.click(); }}><Plus size={14} /> Create your first edit</button></div>}
      <details className="studio-storage-details"><summary><HardDrive size={14} /> Storage and device folder <span>{storage.quota ? formatStudioSize(storage.usage || 0) + " used" : "Local browser storage"}</span></summary><div className="studio-storage-panel"><div><span className="studio-section-kicker">LOCAL STORAGE HEALTH</span><strong>{storage.quota ? formatStudioSize(storage.usage || 0) + " used of " + formatStudioSize(storage.quota) + " browser quota" : "Browser storage estimate unavailable"}</strong><small>Browser-managed storage can be cleared by browser data cleanup. Keep a second copy of important work.</small></div><div className="studio-storage-meter"><span style={{ width: usagePercent + "%" }} /></div><button className="text-button" onClick={() => void refresh()}><RefreshCw size={13} /> Refresh</button></div></details>
    </>}

    {view === "edit" && <div className="studio-edit-workspace">
      <header className="studio-edit-heading"><div><p className="eyebrow">CREATIVE WORKSPACE / EDIT</p><h1>{selected?.title || "Your editing workspace"}</h1><p>Keep the canvas clear. Open only the tools you need.</p></div><div><button className="secondary-button" onClick={() => editInput.current?.click()}><Plus size={14} /> Open media</button><button className="secondary-button" onClick={() => setView("assets")}><FolderOpen size={14} /> Browse assets</button></div></header>
      {!selected && <div className="studio-edit-start">
        <div className="studio-edit-start-card"><ImagePlus size={25} /><strong>Start a photo or design edit</strong><p>Open an image to crop, transform, adjust colour and add text. The original stays untouched.</p><button className="primary-button" onClick={() => editInput.current?.click()}>Choose image</button></div>
        <div className="studio-edit-start-card"><Clapperboard size={25} /><strong>Start a video edit</strong><p>Open a video to preview, set in/out points and export a trimmed clip.</p><button className="primary-button" onClick={() => editInput.current?.click()}>Choose video</button></div>
        <div className="studio-edit-start-card"><Layers3 size={25} /><strong>Continue existing work</strong><p>Open a previously imported image or video from your local Studio assets.</p><button className="secondary-button" onClick={() => setView("assets")}>Browse projects & media</button></div>
      </div>}
      {selected && <div className="studio-active-project"><span className="studio-live-dot" /> PROJECT OPEN <strong>{selected.title}</strong><small>{selected.fileName} · original preserved</small><button className="text-button" onClick={() => { setEditingAsset(null); setEditingVideo(null); }}>Close project</button></div>}
      <div className="studio-tool-accordions">
        <details><summary><Pencil size={14} /> Photo & design tools <span>Crop · transform · adjustments · text</span></summary><div className="studio-tool-list"><span>Crop ratios and rotate / flip</span><span>Brightness, contrast, saturation, warmth and soft focus</span><span>Text overlay with colour and size controls</span><span className="future">Planned: layers, masks, object removal, retouching, curves, gradients, vector tools and AI fill</span></div></details>
        <details><summary><Clapperboard size={14} /> Video tools <span>Preview · in/out trim · WebM export</span></summary><div className="studio-tool-list"><span>Single-clip preview and trim points</span><span>Set IN / OUT at playhead and export trimmed WebM</span><span className="future">Planned: multi-track timeline, transitions, keyframes, speed ramps, chroma key, tracking, colour grading and captions</span></div></details>
        <details><summary><Music2 size={14} /> Audio tools <span>Asset import available</span></summary><div className="studio-tool-list"><span>Import and organize audio and sound effects in Assets</span><span className="future">Planned: waveform timeline, trimming, mixing, EQ, noise reduction, voiceover and beat sync</span></div></details>
        <details><summary><WandSparkles size={14} /> AI & advanced tools <span>Future capability</span></summary><div className="studio-tool-list"><span className="future">Planned: background removal, object cleanup, image generation, upscaling, auto captions, voice tools, scene detection and AI-assisted edits</span><span>Provider-neutral research and model integrations will be added only after their sources and permissions are verified.</span></div></details>
      </div>
      <details className="studio-assistant-dock"><summary><Sparkles size={15} /> Lumi & Motion <span>Collapse / expand creative assistants</span></summary><StudioCreativeTeam selectedAsset={selected ? { title: selected.title, fileName: selected.fileName, category: selected.category, mimeType: selected.mimeType, size: selected.size } : null} /></details>
    </div>}

    {view === "assets" && <>
      <div className="studio-library-head"><div><p className="eyebrow">CREATIVE ASSET LIBRARY</p><h1>Assets</h1><p>Browse your reusable sound effects, VFX, footage, images, overlays and exports.</p></div><div className="studio-asset-actions"><button className="primary-button" onClick={() => fileInput.current?.click()} disabled={busy}><ImagePlus size={15} /> {busy ? "Importing…" : "Upload assets"}</button><button className="secondary-button" onClick={connectFolder}><FolderOpen size={14} /> {folderName || "Connect folder"}</button></div></div>
      <div className="studio-asset-library-note"><ShieldCheck size={14} /> Uploads are stored locally in this browser profile. External asset research and source discovery are planned; no online assets are being fetched yet.</div>
      <div className="studio-library-controls"><label className="studio-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search assets…" /></label><select className="studio-category-select" value={category} onChange={(event) => setCategory(event.target.value as StudioCategory)} aria-label="Upload category">{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
      <div className="studio-filter-row">{["All", ...categories].map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}<span>{filteredAssets.length} item(s)</span></div>
      {filteredAssets.length ? <div className="studio-asset-grid">{filteredAssets.map((asset) => <AssetCard key={asset.id} asset={asset} preview={previewUrls[asset.id]} onOpen={() => openAsset(asset)} onExport={() => void exportAsset(asset)} onRemove={() => void removeAsset(asset)} />)}</div> : <div className="studio-empty"><FileImage size={30} /><strong>No assets in this view</strong><p>Upload your own sound effects, footage, VFX overlays, images, graphics or exports to build your reusable library.</p><button className="primary-button" onClick={() => fileInput.current?.click()}><Plus size={14} /> Upload first asset</button></div>}
    </>}

    {error && <div className="studio-alert error"><X size={14} /> {error}</div>}
    {message && <div className="studio-alert"><ShieldCheck size={14} /> {message}</div>}
    {editingAsset && <StudioImageEditor asset={editingAsset} onClose={() => setEditingAsset(null)} onSaved={() => { void refresh(); window.dispatchEvent(new Event("pruden:studio-assets-updated")); }} />}
    {editingVideo && <StudioVideoEditor asset={editingVideo} onClose={() => setEditingVideo(null)} onSaved={() => { void refresh(); window.dispatchEvent(new Event("pruden:studio-assets-updated")); }} />}
    <footer className="footer-note"><span>PRUDEN STUDIOS <b>·</b> CREATE. CAPTURE. EDIT. DELIVER.</span><span><Aperture size={13} /> Local-first creative workspace</span></footer>
  </section>;
}

function AssetCard({ asset, preview, onOpen, onExport, onRemove }: { asset: StudioAsset; preview?: string; onOpen: () => void; onExport: () => void; onRemove: () => void }) {
  const isImage = asset.mimeType.startsWith("image/");
  const isVideo = asset.mimeType.startsWith("video/");
  const isAudio = asset.mimeType.startsWith("audio/");
  return <article className="studio-asset-card">
    <div className="studio-asset-preview">{isImage ? <img src={preview || ""} alt={asset.title} /> : isVideo ? <Video size={34} /> : isAudio ? <Music2 size={34} /> : <FileImage size={34} />}</div>
    <div className="studio-asset-copy"><span>{asset.category.toUpperCase()}</span><strong title={asset.title}>{asset.title}</strong><small>{asset.fileName} · {formatStudioSize(asset.size)}</small><div>{(isImage || isVideo) && <button onClick={onOpen}><Pencil size={13} /> Open edit</button>}<button onClick={onExport}><ArrowDownToLine size={13} /> Export</button><button onClick={onRemove} aria-label={"Remove " + asset.title}><Trash2 size={13} /></button></div></div>
  </article>;
}
