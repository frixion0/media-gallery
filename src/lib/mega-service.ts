import { Storage, type File as MegaFile_ } from 'megajs';

const MEGA_EMAIL = 'teerajkumarreddy2010@gmail.com';
const MEGA_PASSWORD = 'Frixion@9887';

const MEDIA_FOLDER_NAME = 'media-gallery';

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif']);
const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv']);

function classifyFile(name: string): 'image' | 'video' | 'other' {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (VIDEO_EXTS.has(ext)) return 'video';
  return 'other';
}

export interface MegaFileInfo {
  name: string;
  size: number;
  type: 'image' | 'video';
  nodeId: string;
  path: string;
}

function createStorage(): Storage | null {
  if (!MEGA_EMAIL || !MEGA_PASSWORD) return null;
  return new Storage({ email: MEGA_EMAIL, password: MEGA_PASSWORD });
}

function waitForReady(storage: Storage): Promise<Storage> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Mega connection timed out after 30s')), 30000);
    storage.on('ready', () => { clearTimeout(timeout); resolve(storage); });
    storage.on('error', (err: Error) => { clearTimeout(timeout); reject(err); });
  });
}

function getChildren(node: unknown): MegaFile_[] {
  return (node as { children?: MegaFile_[] }).children || [];
}

function walkForMedia(node: MegaFile_, parentPath: string, results: MegaFileInfo[]): void {
  const children = getChildren(node);
  const currentPath = parentPath === '/' ? `/${node.name}` : `${parentPath}/${node.name}`;

  for (const child of children) {
    if (child.directory) {
      walkForMedia(child, currentPath, results);
    } else {
      const type = classifyFile(child.name);
      if (type !== 'other') {
        results.push({
          name: child.name,
          size: child.size || 0,
          type: type as 'image' | 'video',
          nodeId: child.nodeId || '',
          path: currentPath,
        });
      }
    }
  }
}

async function ensureMediaFolder(storage: Storage) {
  const root = storage.root;
  const children = getChildren(root);
  let folder = children.find((c) => c.name === MEDIA_FOLDER_NAME && c.directory);
  if (!folder) {
    folder = storage.mkdir(MEDIA_FOLDER_NAME);
    await new Promise((r) => setTimeout(r, 1500));
  }
  return folder;
}

export async function listMegaFiles(): Promise<{ files: MegaFileInfo[]; error?: string }> {
  const storage = createStorage();
  if (!storage) return { files: [], error: 'Mega is not configured.' };

  try {
    const readyStorage = await waitForReady(storage);
    const root = readyStorage.root;
    const results: MegaFileInfo[] = [];

    const rootChildren = getChildren(root);
    for (const child of rootChildren) {
      if (child.directory) {
        walkForMedia(child, `/${child.name}`, results);
      } else {
        const type = classifyFile(child.name);
        if (type !== 'other') {
          results.push({
            name: child.name,
            size: child.size || 0,
            type: type as 'image' | 'video',
            nodeId: child.nodeId || '',
            path: `/${child.name}`,
          });
        }
      }
    }

    storage.close?.();
    return { files: results };
  } catch (error: unknown) {
    storage.close?.();
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error listing Mega files:', msg);
    // Return the real error so the UI can show it
    return { files: [], error: `Mega: ${msg}` };
  }
}

export async function uploadToMega(
  fileBuffer: Buffer,
  fileName: string
): Promise<{ success: boolean; fileName: string; size: number; error?: string }> {
  const storage = createStorage();
  if (!storage) return { success: false, fileName, size: 0, error: 'Mega is not configured' };

  try {
    const readyStorage = await waitForReady(storage);
    const folder = await ensureMediaFolder(readyStorage);
    const children = getChildren(folder);

    const duplicate = children.find(
      (c) => c.name === fileName && c.size === fileBuffer.length && !c.directory
    );
    if (duplicate) {
      storage.close?.();
      return { success: true, fileName, size: fileBuffer.length };
    }

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
  } catch (error: unknown) {
    storage.close?.();
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error uploading to Mega:', msg);
    return { success: false, fileName, size: 0, error: `Mega: ${msg}` };
  }
}

export async function downloadFromMega(
  nodeId: string
): Promise<{ buffer: Buffer | null; fileName: string; error?: string }> {
  const storage = createStorage();
  if (!storage) return { buffer: null, fileName: '', error: 'Mega is not configured' };

  try {
    const readyStorage = await waitForReady(storage);

    const nodeMap = new Map<string, MegaFile_>();
    const allNodes = [readyStorage.root];
    while (allNodes.length > 0) {
      const current = allNodes.pop()!;
      const children = getChildren(current);
      for (const child of children) {
        if (child.nodeId) nodeMap.set(child.nodeId, child);
        if (child.directory) allNodes.push(child);
      }
    }

    const node = nodeMap.get(nodeId);
    if (!node || node.directory) {
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
  } catch (error: unknown) {
    storage.close?.();
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Error downloading from Mega:', msg);
    return { buffer: null, fileName: '', error: `Mega: ${msg}` };
  }
}

export function findDuplicateNames(
  megaFiles: MegaFileInfo[],
  existingGitHubFiles: string[]
): Set<string> {
  const gitHubSet = new Set(existingGitHubFiles);
  const duplicates = new Set<string>();
  for (const f of megaFiles) {
    if (gitHubSet.has(f.name)) duplicates.add(f.name);
  }
  return duplicates;
}
