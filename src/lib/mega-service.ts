import { Storage, type File as MegaFile_ } from 'megajs';

const MEGA_EMAIL = process.env.MEGA_EMAIL || '';
const MEGA_PASSWORD = process.env.MEGA_PASSWORD || '';

const MEDIA_FOLDER_NAME = 'media-gallery';

export interface MegaFileInfo {
  name: string;
  size: number;
  type: 'image' | 'video' | 'other';
  nodeId: string;
}

/**
 * Create an authenticated Mega Storage instance.
 */
function createStorage(): Storage | null {
  if (!MEGA_EMAIL || !MEGA_PASSWORD) return null;
  return new Storage({ email: MEGA_EMAIL, password: MEGA_PASSWORD });
}

/**
 * Wait for the storage to be ready and return it.
 */
function waitForReady(storage: Storage): Promise<Storage> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Mega connection timed out'));
    }, 20000);
    storage.on('ready', () => {
      clearTimeout(timeout);
      resolve(storage);
    });
    storage.on('error', (err: Error) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/**
 * Find or create the media-gallery folder in Mega root.
 */
async function ensureMediaFolder(storage: Storage) {
  const root = storage.root;
  const children: MegaFile_[] = (root as unknown as { children?: MegaFile_[] }).children || [];

  let folder = children.find(
    (c) => c.name === MEDIA_FOLDER_NAME && c.directory
  );

  if (!folder) {
    folder = storage.mkdir(MEDIA_FOLDER_NAME);
    // Wait for creation
    await new Promise((r) => setTimeout(r, 1500));
  }

  return folder;
}

/**
 * List all media files from the media-gallery folder in Mega.
 */
export async function listMegaFiles(): Promise<{
  files: MegaFileInfo[];
  error?: string;
}> {
  const storage = createStorage();
  if (!storage) {
    return { files: [], error: 'Mega is not configured. Set MEGA_EMAIL and MEGA_PASSWORD in .env' };
  }

  try {
    const readyStorage = await waitForReady(storage);
    const folder = await ensureMediaFolder(readyStorage);
    const children: MegaFile_[] = (folder as unknown as { children?: MegaFile_[] }).children || [];

    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif'];
    const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv'];

    const files: MegaFileInfo[] = children
      .filter((c) => !c.directory)
      .map((c) => {
        const ext = c.name.split('.').pop()?.toLowerCase() || '';
        let type: 'image' | 'video' | 'other' = 'other';
        if (imageExts.includes(ext)) type = 'image';
        else if (videoExts.includes(ext)) type = 'video';

        return {
          name: c.name,
          size: c.size || 0,
          type,
          nodeId: c.nodeId || '',
        };
      })
      .filter((f) => f.type !== 'other');

    storage.close?.();
    return { files };
  } catch (error) {
    storage.close?.();
    console.error('Error listing Mega files:', error);
    return { files: [], error: 'Failed to connect to Mega. Check your credentials.' };
  }
}

/**
 * Upload a file buffer to Mega media-gallery folder.
 */
export async function uploadToMega(
  fileBuffer: Buffer,
  fileName: string
): Promise<{ success: boolean; fileName: string; size: number; error?: string }> {
  const storage = createStorage();
  if (!storage) {
    return { success: false, fileName, size: 0, error: 'Mega is not configured' };
  }

  try {
    const readyStorage = await waitForReady(storage);
    const folder = await ensureMediaFolder(readyStorage);
    const children: MegaFile_[] = (folder as unknown as { children?: MegaFile_[] }).children || [];

    // Duplicate check by name + size
    const duplicate = children.find(
      (c) => c.name === fileName && c.size === fileBuffer.length && !c.directory
    );

    if (duplicate) {
      storage.close?.();
      return { success: true, fileName, size: fileBuffer.length };
    }

    // Upload using Buffer
    const upload = readyStorage.upload(
      { name: fileName, size: fileBuffer.length },
      folder
    );

    await new Promise<void>((resolve, reject) => {
      upload.on('complete', () => resolve());
      upload.on('error', (err: Error) => reject(err));
      upload.end(fileBuffer);
    });

    storage.close?.();
    return { success: true, fileName, size: fileBuffer.length };
  } catch (error) {
    storage.close?.();
    console.error('Error uploading to Mega:', error);
    return { success: false, fileName, size: 0, error: 'Failed to upload to Mega.' };
  }
}

/**
 * Download a file from Mega by nodeId.
 */
export async function downloadFromMega(
  nodeId: string
): Promise<{ buffer: Buffer | null; fileName: string; error?: string }> {
  const storage = createStorage();
  if (!storage) {
    return { buffer: null, fileName: '', error: 'Mega is not configured' };
  }

  try {
    const readyStorage = await waitForReady(storage);
    const folder = await ensureMediaFolder(readyStorage);
    const children: MegaFile_[] = (folder as unknown as { children?: MegaFile_[] }).children || [];
    const node = children.find((c) => c.nodeId === nodeId);

    if (!node) {
      storage.close?.();
      return { buffer: null, fileName: '', error: 'File not found in Mega.' };
    }

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = node.download();

      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', (err: Error) => reject(err));
    });

    storage.close?.();
    return { buffer, fileName: node.name };
  } catch (error) {
    storage.close?.();
    console.error('Error downloading from Mega:', error);
    return { buffer: null, fileName: '', error: 'Failed to download from Mega.' };
  }
}

/**
 * Check for duplicate files between GitHub and Mega.
 */
export async function checkDuplicates(
  existingGitHubFiles: string[]
): Promise<{
  duplicateNames: Set<string>;
  megaFileNames: Set<string>;
  error?: string;
}> {
  const { files, error } = await listMegaFiles();

  if (error) {
    return { duplicateNames: new Set(), megaFileNames: new Set(), error };
  }

  const megaFileNames = new Set(files.map((f) => f.name));
  const gitHubFileNames = new Set(existingGitHubFiles);

  const duplicateNames = new Set<string>();
  for (const name of megaFileNames) {
    if (gitHubFileNames.has(name)) {
      duplicateNames.add(name);
    }
  }

  return { duplicateNames, megaFileNames };
}