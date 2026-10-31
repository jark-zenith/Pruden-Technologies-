export type StudioCategory = "Photos" | "Posters & Designs" | "Videos" | "Exports";
export type StudioAsset = {
  id: string;
  title: string;
  fileName: string;
  category: StudioCategory;
  mimeType: string;
  size: number;
  createdAt: string;
  blob: Blob;
};

type StudioDirectoryHandle = {
  name: string;
  getDirectoryHandle: (name: string, options?: { create?: boolean }) => Promise<StudioDirectoryHandle>;
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<{
    createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }>;
  }>;
  queryPermission?: (options: { mode: "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (options: { mode: "readwrite" }) => Promise<PermissionState>;
};

const DB_NAME = "pruden-studios";
const DB_VERSION = 1;
const ASSETS = "assets";
const SETTINGS = "settings";

function openStudioDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ASSETS)) db.createObjectStore(ASSETS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(SETTINGS)) db.createObjectStore(SETTINGS, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open the local Studio library."));
  });
}

export async function listStudioAssets(): Promise<StudioAsset[]> {
  const db = await openStudioDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(ASSETS, "readonly").objectStore(ASSETS).getAll();
    request.onsuccess = () => {
      db.close();
      resolve((request.result as StudioAsset[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function saveStudioAsset(file: File, category: StudioCategory, title: string): Promise<StudioAsset> {
  const asset: StudioAsset = {
    id: crypto.randomUUID(),
    title: title.trim() || file.name,
    fileName: file.name,
    category,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    createdAt: new Date().toISOString(),
    blob: file,
  };
  const db = await openStudioDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(ASSETS, "readwrite").objectStore(ASSETS).put(asset);
    request.onsuccess = () => { db.close(); resolve(asset); };
    request.onerror = () => { db.close(); reject(request.error || new Error("Could not save this file locally.")); };
  });
}

export async function deleteStudioAsset(id: string): Promise<void> {
  const db = await openStudioDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(ASSETS, "readwrite").objectStore(ASSETS).delete(id);
    request.onsuccess = () => { db.close(); resolve(); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function saveStudioDirectoryHandle(handle: StudioDirectoryHandle): Promise<void> {
  const db = await openStudioDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(SETTINGS, "readwrite").objectStore(SETTINGS).put({ id: "media-directory", handle });
    request.onsuccess = () => { db.close(); resolve(); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function getStudioDirectoryHandle(): Promise<StudioDirectoryHandle | null> {
  const db = await openStudioDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(SETTINGS, "readonly").objectStore(SETTINGS).get("media-directory");
    request.onsuccess = () => { db.close(); resolve((request.result?.handle as StudioDirectoryHandle) || null); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

export async function writeAssetToStudioFolder(handle: StudioDirectoryHandle, asset: StudioAsset): Promise<void> {
  const permission = await handle.queryPermission?.({ mode: "readwrite" });
  const granted = permission === "granted" || (await handle.requestPermission?.({ mode: "readwrite" })) === "granted";
  if (!granted) throw new Error("Folder access is not currently granted. Reconnect the folder and allow read/write access.");
  const folder = await handle.getDirectoryHandle(asset.category, { create: true });
  const fileHandle = await folder.getFileHandle(asset.fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(asset.blob);
  await writable.close();
}

export function formatStudioSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}
