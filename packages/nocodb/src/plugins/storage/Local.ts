import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { Readable } from 'stream';
import mkdirp from 'mkdirp';
import axios from 'axios';
import { useAgent } from 'request-filtering-agent';
import { globStream } from 'glob';
import type { IStorageAdapterV2, XcFile } from '~/types/nc-plugin';
import { validateAndNormaliseLocalPath } from '~/helpers/attachmentHelpers';
import { getToolDir } from '~/utils/nc-config';

export default class Local implements IStorageAdapterV2 {
  name = 'Local';

  public async fileCreate(key: string, file: XcFile): Promise<any> {
    const destPath = validateAndNormaliseLocalPath(key);
    try {
      await mkdirp(path.dirname(destPath));
      const data = await promisify(fs.readFile)(file.path);
      await promisify(fs.writeFile)(destPath, data);
      await promisify(fs.unlink)(file.path);
      // await fs.promises.rename(file.path, destPath);
    } catch (e) {
      throw e;
    }
  }

  async fileCreateByUrl(
    key: string,
    url: string,
    { fetchOptions: { buffer } = { buffer: false } },
  ): Promise<any> {
    try {
      const destPath = validateAndNormaliseLocalPath(key);
      const response = await axios.get(url, {
        responseType: buffer ? 'arraybuffer' : 'stream',
        headers: {
          accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
          'accept-language': 'en-US,en;q=0.9',
          'cache-control': 'no-cache',
          pragma: 'no-cache',
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
          origin: 'https://www.airtable.com/',
        },
        httpAgent: useAgent(url, { stopPortScanningByUrlRedirection: true }),
        httpsAgent: useAgent(url, { stopPortScanningByUrlRedirection: true }),
      });

      await mkdirp(path.dirname(destPath));
      if (buffer) {
        await fs.promises.writeFile(destPath, Buffer.from(response.data));
        return {
          url: null,
          data: response.data,
        };
      } else {
        await this.fileCreateByStream(key, response.data);
        return {
          url: null,
          data: null,
        };
      }
    } catch (err) {
      throw new Error(`Failed to create file from URL: ${err.message}`);
    }
  }

  public async fileCreateByStream(
    key: string,
    stream: Readable,
  ): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const destPath = validateAndNormaliseLocalPath(key);
      try {
        mkdirp(path.dirname(destPath)).then(() => {
          const writableStream = fs.createWriteStream(destPath);
          writableStream.on('finish', () => {
            this.fileRead(destPath)
              .then(() => {
                resolve(null);
              })
              .catch((e) => {
                reject(e);
              });
          });
          writableStream.on('error', (err) => reject(err));
          stream.pipe(writableStream);
        });
      } catch (e) {
        throw e;
      }
    });
  }

  public async fileReadByStream(
    key: string,
    options: { encoding?: string },
  ): Promise<Readable> {
    const srcPath = validateAndNormaliseLocalPath(key);
    return fs.createReadStream(srcPath, {
      ...(options?.encoding && {
        encoding: options.encoding as BufferEncoding,
      }),
    });
  }

  public async getDirectoryList(key: string): Promise<string[]> {
    const destDir = validateAndNormaliseLocalPath(key);
    return fs.promises.readdir(destDir);
  }

  fileDelete(path: string): Promise<any> {
    return fs.promises.unlink(validateAndNormaliseLocalPath(path));
  }

  public async fileRead(filePath: string): Promise<any> {
    try {
      const fileData = await fs.promises.readFile(
        validateAndNormaliseLocalPath(filePath, true),
      );
      return fileData;
    } catch (e) {
      throw e;
    }
  }

  public async scanFiles(globPattern: string) {
    // Validate the input glob pattern to prevent path traversal
    if (!globPattern || typeof globPattern !== 'string') {
      throw new Error('Invalid glob pattern: must be a non-empty string');
    }

    // Check for dangerous patterns that could escape the base directory
    if (globPattern.includes('..')) {
      throw new Error('Invalid glob pattern: parent directory references not allowed');
    }

    if (globPattern.includes('\x00') || globPattern.includes('\0')) {
      throw new Error('Invalid glob pattern: contains null byte');
    }

    // Validate the pattern doesn't contain absolute path indicators
    if (path.isAbsolute(globPattern)) {
      throw new Error('Invalid glob pattern: absolute paths not allowed');
    }

    // Platform-specific validation
    if (process.platform === 'win32') {
      if (/^[\\/]{2}/.test(globPattern) || /^[a-zA-Z]:/.test(globPattern)) {
        throw new Error('Invalid glob pattern: Windows absolute paths not allowed');
      }
    }

    // Normalize the pattern safely
    let normalizedPattern = globPattern;
    
    // Remove leading slash
    normalizedPattern = normalizedPattern.replace(/^\/+/, '');
    
    // Convert to forward slashes consistently (glob library expects this)
    normalizedPattern = normalizedPattern.replace(/\\/g, '/');

    // Ensure the pattern is within nc/uploads/ directory
    if (!normalizedPattern.startsWith('nc/uploads/')) {
      // If it doesn't start with nc/uploads/, prepend it
      normalizedPattern = `nc/uploads/${normalizedPattern}`;
    }

    // Final validation: ensure the normalized pattern doesn't escape
    const segments = normalizedPattern.split('/').filter(s => s !== '');
    for (const segment of segments) {
      if (segment === '..') {
        throw new Error('Invalid glob pattern: contains parent directory reference after normalization');
      }
    }

    // Get the tool directory and construct the full pattern
    const toolDir = getToolDir();
    const fullPattern = path.join(toolDir, normalizedPattern);

    // Validate that the base path of the pattern is within our allowed directory
    const basePath = path.dirname(fullPattern);
    const allowedBase = path.resolve(toolDir, 'nc', 'uploads');
    
    if (!basePath.startsWith(allowedBase)) {
      throw new Error('Invalid glob pattern: resolves outside allowed directory');
    }

    const stream = globStream(fullPattern, {
      nodir: true,
      absolute: false,
      cwd: toolDir,
    });

    return Readable.from(stream);
  }

  init(): Promise<any> {
    return Promise.resolve(undefined);
  }

  test(): Promise<boolean> {
    return Promise.resolve(false);
  }
  getUploadedPath(filePath: string): { path?: string; url?: string } {
    const usePath = filePath.startsWith('/')
      ? filePath.replace(/^\/+/, '')
      : filePath;

    return {
      path: path.join('download', usePath),
    };
  }
}
