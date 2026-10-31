import { useEffect, useMemo, useRef, useState } from "react";
import { Aperture, ArrowDownToLine, Clapperboard, FileImage, FolderOpen, HardDrive, ImagePlus, Layers3, RefreshCw, Search, ShieldCheck, Trash2, Video, X } from "lucide-react";
import { deleteStudioAsset, formatStudioSize, getStudioDirectoryHandle, listStudioAssets, saveStudioAsset, saveStudioDirectoryHandle, writeAssetToStudioFolder, type StudioAsset, type StudioCategory } from "./lib/studioLibrary";
import "./PrudenStudiosPage.css";

const categories: StudioCategory[] = ["Photos", "Posters & Designs", "Videos", "Exports"];

export default function PrudenStudiosPage() {
  const [assets, setAssets] = useState<StudioAsset[]>([]);
  const [category, setCategory] = useState<StudioCategory>("Photos");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [folderName, setFolderName] = useState("");
  const [folderHandle, setFolderHandle] = useState<Awaited<ReturnType<typeof getStudioDirectoryHandle>>>(null);
  const [storage, setStorage] = useState<{ usage?: number; quota?: number }>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

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
      setFolderHandle(handle);
      setFolderName(handle.name);
      await saveStudioDirectoryHandle(handle);
      setMessage("Device folder connected. New imports can be copied into category folders.");
      setError("");
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "Could not connect the folder.");
    }
  }

  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setError(""); setMessage("");
    let saved = 0;
    try {
      for (const file of Array.from(files)) {
        const asset = await saveStudioAsset(file, category, file.name.replace(/\\.[^.]+$/, ""));
        if (folderHandle) {
          try { await writeAssetToStudioFolder(folderHandle, asset); }
          catch (cause) { setError(cause instanceof Error ? cause.message : "Saved to browser storage, but folder copy failed."); }
        }
        saved += 1;
      }
      await refresh();
      setMessage(folderHandle
        ? saved + " file(s) added to the Studio library. Folder copies were attempted."
        : saved + " file(s) saved in this browser's local Studio library.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Import failed.");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function exportAsset(asset: StudioAsset) {
    if (folderHandle) {
      try {
        await writeAssetToStudioFolder(folderHandle, asset);
        setMessage(asset.fileName + " copied to " + folderName + "/" + asset.category + ".");
        setError("");
        return;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Folder export failed.");
      }
    }
    const url = URL.createObjectURL(asset.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = asset.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function removeAsset(asset: StudioAsset) {
    if (!window.confirm("Remove " + asset.fileName + " from the Studio browser library? This does not delete a copy already exported to your device folder.")) return;
    await deleteStudioAsset(asset.id);
    await refresh();
  }

  const totalBytes = assets.reduce((sum, asset) => sum + asset.size, 0);
  const usagePercent = storage.quota ? Math.min(100, Math.round(((storage.usage || 0) / storage.quota) * 100)) : 0;

  return <section className="module-page studio-page">
    <div className="studio-hero">
      <div className="studio-hero-copy">
        <p className="eyebrow"><span className="studio-live-dot" /> PRUDEN TECHNOLOGIES / CREATIVE DIVISION</p>
        <h1>Pruden <em>Studios</em></h1>
        <p>Photography, visual design and video production — one workspace for every creative deliverable.</p>
        <div className="studio-hero-actions">
          <button className="primary-button" onClick={() => fileInput.current?.click()} disabled={busy}><ImagePlus size={16} /> {busy ? "Importing…" : "Import media"}</button>
          <button className="secondary-button" onClick={() => window.dispatchEvent(new CustomEvent("pruden:open-media-desk", { detail: { tab: "studio" } }))}><Clapperboard size={15} /> Open Media Desk</button>
          <button className="secondary-button" onClick={connectFolder}><FolderOpen size={15} /> {folderName ? "Change device folder" : "Connect device folder"}</button>
          <input ref={fileInput} type="file" accept="image/*,video/*,.pdf" multiple hidden onChange={(event) => void importFiles(event.target.files)} />
        </div>
        <p className="studio-privacy"><ShieldCheck size={14} /> Files are stored in this browser profile first. Nothing is uploaded to a cloud service by this Studio screen.</p>
      </div>
      <div className="studio-hero-art"><div className="studio-aperture"><Aperture size={76} strokeWidth={1.1} /></div><span>CREATE / CAPTURE / DELIVER</span><small>PRUDEN STUDIOS · EST. 2026</small></div>
    </div>

    <div className="studio-stats">
      <article className="studio-stat"><span><Layers3 size={16} /> LIBRARY ITEMS</span><strong>{String(assets.length).padStart(2, "0")}</strong><small>Local media records</small></article>
      <article className="studio-stat"><span><HardDrive size={16} /> MEDIA SIZE</span><strong>{formatStudioSize(totalBytes)}</strong><small>Files held in browser storage</small></article>
      <article className="studio-stat"><span><FolderOpen size={16} /> DEVICE FOLDER</span><strong className="studio-stat-status">{folderName || "Not linked"}</strong><small>{folderName ? "Folder permission may need renewal" : "Optional direct folder export"}</small></article>
    </div>

    <div className="studio-storage-panel">
      <div><span className="studio-section-kicker">LOCAL STORAGE HEALTH</span><strong>{storage.quota ? formatStudioSize(storage.usage || 0) + " used of " + formatStudioSize(storage.quota) + " browser quota" : "Browser storage estimate unavailable"}</strong><small>Browser-managed storage is local to this device profile and may be cleared by browser data cleanup. Keep a second copy of important work.</small></div>
      <div className="studio-storage-meter"><span style={{ width: usagePercent + "%" }} /></div>
      <button className="text-button" onClick={() => void refresh()}><RefreshCw size={13} /> Refresh</button>
    </div>

    {error && <div className="studio-alert error"><X size={14} /> {error}</div>}
    {message && <div className="studio-alert"><ShieldCheck size={14} /> {message}</div>}

    <div className="studio-library-head">
      <div><p className="eyebrow">CREATIVE ASSET REGISTER</p><h2>Your Studio Library</h2><p>Import original captures, poster designs, edited videos and final exports.</p></div>
      <label className="studio-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your work…" /></label>
    </div>
    <div className="studio-filter-row">
      {["All", ...categories].map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}
      <span>{filteredAssets.length} item(s)</span>
    </div>
    {filteredAssets.length === 0 ? <div className="studio-empty"><FileImage size={30} /><strong>Your creative library starts here</strong><p>Import a photo, poster, video or export. Your files will appear here and in the Media Desk library.</p><button className="secondary-button" onClick={() => fileInput.current?.click()}><ImagePlus size={14} /> Add your first media file</button></div> :
      <div className="studio-asset-grid">{filteredAssets.map((asset) => <article className="studio-asset-card" key={asset.id}>
        <div className="studio-asset-preview">{asset.mimeType.startsWith("image/") ? <img src={URL.createObjectURL(asset.blob)} alt={asset.title} /> : asset.mimeType.startsWith("video/") ? <Video size={34} /> : <FileImage size={34} />}</div>
        <div className="studio-asset-copy"><span>{asset.category.toUpperCase()}</span><strong title={asset.title}>{asset.title}</strong><small>{asset.fileName} · {formatStudioSize(asset.size)}</small><div><button onClick={() => void exportAsset(asset)}><ArrowDownToLine size={13} /> Export</button><button onClick={() => void removeAsset(asset)} aria-label={"Remove " + asset.title}><Trash2 size={13} /></button></div></div>
      </article>)}</div>
    }
    <footer className="footer-note"><span>PRUDEN STUDIOS <b>·</b> CREATE. CAPTURE. EDIT. DELIVER.</span><span><Aperture size={13} /> Local-first creative workspace</span></footer>
  </section>;
}
