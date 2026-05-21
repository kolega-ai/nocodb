import path from 'path';
import fs from 'fs';
import mime from 'mime/lite';
import slash from 'slash';
import { PublicAttachmentScope } from 'nocodb-sdk';
import { nanoid } from 'nanoid';
import moment from 'dayjs';
import hash from 'object-hash';
import type { NcContext } from 'nocodb-sdk';
import type { Column } from '~/models';
import { isSecureAttachmentEnabled } from '~/utils';
import { getToolDir } from '~/utils/nc-config';
import { NcError } from '~/helpers/catchError';

const previewableMimeTypes = ['image', 'pdf', 'video', 'audio'];

export function isPreviewAllowed(args: { mimetype?: string; path?: string }) {
  const { mimetype, path } = args;

  if (mimetype) {
    return previewableMimeTypes.some((type) => mimetype.includes(type));
  } else if (path) {
    const ext = path.split('.').pop();

    // clear query params
    const extWithoutQuery = ext?.split('?')[0];

    if (extWithoutQuery) {
      const mimeType = mime.getType(extWithoutQuery);
      return previewableMimeTypes.some((type) => mimeType?.includes(type));
    }
  }

  return false;
}

// method for validate/normalise the path for avoid path traversal attack
export function validateAndNormaliseLocalPath(
  fileOrFolderPath: string,
  throw404 = false,
): string {
  // Input validation - handle null/undefined
  if (!fileOrFolderPath || typeof fileOrFolderPath !== 'string') {
    if (throw404) {
      NcError.notFound();
    } else {
      NcError.badRequest('Invalid path: must be a non-empty string');
    }
  }

  // Layer 1: Input sanitization - check for dangerous patterns
  // Check for null bytes - critical for preventing null byte injection attacks
  if (fileOrFolderPath.includes('\x00') || fileOrFolderPath.includes('\0')) {
    NcError.badRequest('Invalid path: contains null byte');
  }

  // Check for URL-encoded dangerous sequences to prevent encoding attacks
  const encodedPatterns = [
    /%2e/i,     // Encoded .
    /%2f/i,     // Encoded /
    /%5c/i,     // Encoded \
    /%00/i,     // Encoded null
    /%c0%ae/i,  // Overlong UTF-8 encoding of .
    /%c0%af/i,  // Overlong UTF-8 encoding of /
    /%c1%9c/i,  // Overlong UTF-8 encoding of \
    /%25/i,     // Double encoding prefix
  ];

  for (const pattern of encodedPatterns) {
    if (pattern.test(fileOrFolderPath)) {
      NcError.badRequest(`Invalid path: contains encoded sequence ${pattern}`);
    }
  }

  // Check for dangerous Unicode characters that could normalize to traversal sequences
  const dangerousUnicode = [
    /\u2024/g,  // ONE DOT LEADER
    /\u2025/g,  // TWO DOT LEADER
    /\u2026/g,  // HORIZONTAL ELLIPSIS
    /\uff0e/g,  // FULLWIDTH FULL STOP
    /\uff0f/g,  // FULLWIDTH SOLIDUS
    /\uff3c/g,  // FULLWIDTH REVERSE SOLIDUS
  ];

  for (const pattern of dangerousUnicode) {
    if (pattern.test(fileOrFolderPath)) {
      NcError.badRequest('Invalid path: contains dangerous Unicode character');
    }
  }

  // Layer 2: Platform-specific validation
  const isWindows = process.platform === 'win32';
  
  if (isWindows) {
    // Block UNC paths (\\server\share or //server/share)
    if (/^[\\/]{2}/.test(fileOrFolderPath)) {
      NcError.badRequest('Invalid path: UNC paths are not allowed');
    }

    // Block absolute paths with drive letters in input
    if (/^[a-zA-Z]:/.test(fileOrFolderPath)) {
      NcError.badRequest('Invalid path: drive letters not allowed in input');
    }

    // Block Windows reserved names
    const basename = path.basename(fileOrFolderPath);
    const reservedPattern = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;
    if (reservedPattern.test(basename)) {
      NcError.badRequest('Invalid path: Windows reserved filename');
    }

    // Block alternate data streams
    if (fileOrFolderPath.includes(':') && !/^[a-zA-Z]:[\\/]/.test(fileOrFolderPath)) {
      NcError.badRequest('Invalid path: alternate data stream syntax not allowed');
    }
  }

  // Block backslash on non-Windows platforms
  if (!isWindows && fileOrFolderPath.includes('\\')) {
    NcError.badRequest('Invalid path: backslash not allowed on non-Windows platforms');
  }

  // Layer 3: Path normalization and containment check
  // Normalize the path using slash to handle cross-platform path separators
  let normalizedPath = slash(fileOrFolderPath);
  
  // Normalize Unicode using NFC to prevent normalization attacks
  normalizedPath = normalizedPath.normalize('NFC');

  const toolDir = getToolDir();
  const absoluteBasePath = path.resolve(toolDir, 'nc');

  // Split path into segments and validate each segment
  const segments = normalizedPath
    .split('/')
    .filter(segment => segment !== '' && segment !== '.');

  // Explicitly check for parent directory references
  for (const segment of segments) {
    if (segment === '..') {
      NcError.badRequest('Invalid path: parent directory reference (..) not allowed');
    }
    
    // Check for segments that look like .. with invisible characters
    if (segment.replace(/[\s\u200b\u200c\u200d\ufeff]/g, '') === '..') {
      NcError.badRequest('Invalid path: hidden traversal sequence detected');
    }
  }

  // Resolve the absolute path safely
  const absolutePath = path.resolve(absoluteBasePath, ...segments);

  // Layer 4: Containment verification using multiple methods
  // Method 1: Calculate relative path from base to resolved path
  const relativePath = path.relative(absoluteBasePath, absolutePath);
  
  // If relative path starts with .. or is absolute, it's outside the base
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    if (throw404) {
      NcError.notFound();
    } else {
      NcError.badRequest('Invalid path: resolves outside base directory');
    }
  }

  // Method 2: Ensure resolved path actually starts with base directory
  // Add path separator to ensure we're checking at directory boundaries
  const resolvedWithSep = absolutePath + (absolutePath.endsWith(path.sep) ? '' : path.sep);
  const baseWithSep = absoluteBasePath + (absoluteBasePath.endsWith(path.sep) ? '' : path.sep);
  
  if (!resolvedWithSep.startsWith(baseWithSep) && absolutePath !== absoluteBasePath) {
    if (throw404) {
      NcError.notFound();
    } else {
      NcError.badRequest('Invalid path: escapes base directory');
    }
  }

  return absolutePath;
}

export function getPathFromUrl(url: string, removePrefix = false) {
  const newUrl = new URL(encodeURI(url));

  const pathName = removePrefix
    ? newUrl.pathname.replace(/.*?nc\/uploads\//, '')
    : newUrl.pathname;

  return decodeURI(`${pathName}${newUrl.search}${newUrl.hash}`);
}

export const localFileExists = (path: string) => {
  return fs.promises
    .access(path)
    .then(() => true)
    .catch(() => false);
};

export const ATTACHMENT_ROOTS = [
  'thumbnails',
  PublicAttachmentScope.WORKSPACEPICS,
  PublicAttachmentScope.PROFILEPICS,
  PublicAttachmentScope.ORGANIZATIONPICS,
];

export const validateNumberOfFilesInCell = async (
  _context: NcContext,
  _number: number,
  _column: Column,
) => {};

// ref: https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html - extended with some more characters
const normalizeFilename = (filename: string) => {
  return filename.replace(/[\\/:*?"<>'`#|%~{}[\]^]/g, '_');
};

export const getFileNameFromUrl = (param: { url: string; scope?: string }) => {
  const originalFileName =
    param.url.split('/').pop()?.split('?')[0] || 'attachment';
  const fileName = param.scope
    ? `${normalizeFilename(path.parse(originalFileName).name)}${path.extname(
        originalFileName,
      )}`
    : `${normalizeFilename(path.parse(originalFileName).name)}_${nanoid(
        5,
      )}${path.extname(originalFileName)}`;
  return { originalFileName, fileName };
};

export interface AttachmentFilePathConstructed {
  workspaceId?: string;
  baseId: string;
  modelId: string;
  columnId: string;
  scope?: string;

  filePath: string;
  destPath: string;
  fileName: string;
  originalFileName: string;
  storageDest: string;
}

export const constructFilePath = (
  context: NcContext,
  param: {
    fileName: string;
    originalFileName: string;
    modelId: string;
    columnId: string;
    scope?: string;
  },
) => {
  let filePath = path.join(
    ...[
      // somehow, even in production gui upload doesn't use workspace id
      'noco', // context.workspace_id,
      context.base_id,
      param.modelId,
      param.columnId,
      param.scope ? nanoid(5) : undefined,
    ].filter((k) => k),
  );

  if (param.scope) {
    filePath = hash(context.user.id);
  } else if (isSecureAttachmentEnabled) {
    filePath = `${moment().format('YYYY/MM/DD')}/${hash(context.user.id)}`;
  }

  const destPath = path.join(...['nc', param.scope ?? 'uploads', filePath]);

  return {
    workspaceId: context.workspace_id,
    baseId: context.base_id,
    modelId: param.modelId,
    columnId: param.columnId,
    scope: param.scope,
    filePath,
    destPath,
    fileName: param.fileName,
    originalFileName: param.originalFileName,
    storageDest: slash(path.join(destPath, param.fileName)),
  } as AttachmentFilePathConstructed;
};
