import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, query, orderBy } from 'firebase/firestore';

const DB_NAME = 'wavelink_media_db';
const STORE_NAME = 'videos';

// Helper to open IndexedDB
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Store video blob or dataUrl in IndexedDB
export async function cacheVideoLocally(id: string, data: string | Blob): Promise<void> {
  try {
    const idb = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(data, id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not cache video in IndexedDB:', err);
  }
}

// Retrieve cached video from IndexedDB
export async function getCachedVideo(id: string): Promise<string | null> {
  try {
    const idb = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = idb.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        const result = req.result;
        if (!result) return resolve(null);
        if (result instanceof Blob) {
          resolve(URL.createObjectURL(result));
        } else if (typeof result === 'string') {
          resolve(result);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

const CHUNK_SIZE = 500 * 1024; // 500KB per chunk to safely remain well within Firestore's 1MB limit

// Chunk & save video with fast concurrent batching and progress tracking
export async function saveVideoPost(
  postId: string,
  file: File | Blob,
  dataUrl: string,
  collectionName: 'posts' | 'sparks' = 'posts',
  onProgress?: (percentage: number) => void
): Promise<{ videoUrl?: string; hasVideoChunks: boolean }> {
  // 1. Immediately cache locally in IndexedDB for instant zero-latency playback
  await cacheVideoLocally(postId, file);
  if (onProgress) onProgress(15);

  // 2. If size is under 650KB, it fits directly into root document field
  if (dataUrl.length < 650 * 1024) {
    if (onProgress) onProgress(100);
    return {
      videoUrl: dataUrl,
      hasVideoChunks: false
    };
  }

  // 3. Fast concurrent chunk uploading
  try {
    const totalChunks = Math.ceil(dataUrl.length / CHUNK_SIZE);
    const chunksRef = collection(db, collectionName, postId, 'chunks');

    // Process in parallel batches of 5 concurrent writes for maximum speed
    const BATCH_SIZE = 5;
    for (let i = 0; i < totalChunks; i += BATCH_SIZE) {
      const batchPromises = [];
      const currentBatchEnd = Math.min(i + BATCH_SIZE, totalChunks);

      for (let j = i; j < currentBatchEnd; j++) {
        const chunkData = dataUrl.substring(j * CHUNK_SIZE, (j + 1) * CHUNK_SIZE);
        const chunkId = `chunk_${j.toString().padStart(4, '0')}`;
        batchPromises.push(
          setDoc(doc(chunksRef, chunkId), {
            index: j,
            total: totalChunks,
            data: chunkData
          })
        );
      }

      await Promise.all(batchPromises);
      if (onProgress) {
        const progress = Math.min(95, Math.round(15 + ((currentBatchEnd / totalChunks) * 80)));
        onProgress(progress);
      }
    }

    if (onProgress) onProgress(100);

    return {
      videoUrl: undefined, // Chunks stored in subcollection
      hasVideoChunks: true
    };
  } catch (err) {
    console.warn(`Error fast-chunking video to ${collectionName}, falling back to local cache:`, err);
    return {
      videoUrl: undefined,
      hasVideoChunks: false
    };
  }
}

// Retrieve full video for a post or spark
export async function resolveVideoUrl(
  entityId: string,
  directVideoUrl?: string,
  hasVideoChunks?: boolean,
  collectionName: 'posts' | 'sparks' = 'posts'
): Promise<string | null> {
  // 1. Check local IndexedDB cache first
  const local = await getCachedVideo(entityId);
  if (local && !local.startsWith('data:image/')) return local;

  // 2. Check if directVideoUrl is a real video URL (http, blob, or data:video)
  const isRealDirectVideo =
    directVideoUrl &&
    (directVideoUrl.startsWith('http') ||
     directVideoUrl.startsWith('blob:') ||
     directVideoUrl.startsWith('data:video/'));

  if (isRealDirectVideo && !hasVideoChunks) {
    return directVideoUrl!;
  }

  // 3. If video chunks exist in subcollection (or directVideoUrl was a thumbnail image or empty)
  if (hasVideoChunks || !isRealDirectVideo) {
    try {
      const chunksRef = collection(db, collectionName, entityId, 'chunks');
      const q = query(chunksRef, orderBy('index', 'asc'));
      const snap = await getDocs(q);

      if (!snap.empty) {
        let assembled = '';
        snap.forEach((d) => {
          assembled += d.data().data || '';
        });
        if (assembled) {
          await cacheVideoLocally(entityId, assembled);
          return assembled;
        }
      }
    } catch (err) {
      console.error(`Failed loading video chunks from ${collectionName}:`, err);
    }
  }

  // 4. Fallback if it is a real direct video
  if (isRealDirectVideo) return directVideoUrl!;

  return null;
}

/**
 * Automatically compress and downscale user images (from mobile cameras or desktop)
 * so that they never exceed Firestore's 1MB limit. Typically produces a 100KB - 250KB JPEG.
 */
export function compressImage(
  file: File | Blob,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve) => {
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      let compressed = canvas.toDataURL('image/jpeg', quality);

      // Strict safeguard: ensure dataUrl is well within Firestore's 1MB limit
      if (compressed.length > 600 * 1024) {
        compressed = canvas.toDataURL('image/jpeg', 0.6);
      }
      if (compressed.length > 600 * 1024) {
        compressed = canvas.toDataURL('image/jpeg', 0.45);
      }

      resolve(compressed);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Generate a tiny lightweight thumbnail for video posts/sparks (~15KB-30KB)
 */
export function generateVideoThumbnail(file: File | Blob): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    video.onloadeddata = () => {
      video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(480, video.videoWidth || 480);
        canvas.height = Math.min(360, video.videoHeight || 360);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumb = canvas.toDataURL('image/jpeg', 0.6);
          URL.revokeObjectURL(objectUrl);
          resolve(thumb);
          return;
        }
      } catch {
        // Ignore canvas draw error
      }
      URL.revokeObjectURL(objectUrl);
      resolve('');
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve('');
    };

    // Safety timeout in case video seek stalls
    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      resolve('');
    }, 2500);
  });
}

// Built-in presets for quick community video posting
export interface SampleClip {
  title: string;
  category: string;
  url: string;
  duration: string;
}

export const SAMPLE_VIDEOS: SampleClip[] = [
  {
    title: 'Ocean Sunset Surf',
    category: 'Nature',
    duration: '0:10',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  },
  {
    title: 'Cosmic Star Galaxy',
    category: 'Space',
    duration: '0:15',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
  },
  {
    title: 'Urban Cyber Drive',
    category: 'Vibe',
    duration: '0:12',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'
  },
  {
    title: 'Deep Forest Stream',
    category: 'Calm',
    duration: '0:14',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4'
  }
];
