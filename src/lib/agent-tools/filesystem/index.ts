#!/usr/bin/env node

import { tool } from '@openai/agents'
import fs from "fs/promises";
import { createReadStream } from "fs";
import { createRequire } from 'module';
const nodeRequire = createRequire(import.meta.url);
const pdf = nodeRequire('pdf-parse/lib/pdf-parse.js');
import path from "path";
import { z } from "zod";
import { minimatch } from "minimatch";
import { normalizePath, expandHome } from './path-utils.js';
import {
  // Function imports
  formatSize,
  validatePath,
  getFileStats,
  readFileContent,
  writeFileContent,
  searchFilesWithValidation,
  applyFileEdits,
  tailFile,
  headFile,
  setAllowedDirectories,
  getAllowedDirectories,
} from './lib.js';


/**
 * Initialize file system tools with allowed directories
 * @param directories - Array of directory paths to allow access to
 * @throws Error if any directory is invalid or inaccessible
 */
export async function initializeFileSystemTools(directories: string[]): Promise<void> {
  if (!directories || directories.length === 0) {
    throw new Error("At least one directory must be provided");
  }

  // Store allowed directories in normalized and resolved form
  const allowedDirectories = await Promise.all(
    directories.map(async (dir) => {
      const expanded = expandHome(dir);
      const absolute = path.resolve(expanded);
      try {
        // Security: Resolve symlinks in allowed directories during startup
        // This ensures we know the real paths and can validate against them later
        const resolved = await fs.realpath(absolute);
        return normalizePath(resolved);
      } catch (error) {
        // If we can't resolve (doesn't exist), use the normalized absolute path
        // This allows configuring allowed dirs that will be created later
        return normalizePath(absolute);
      }
    })
  );

  // Validate that all directories exist and are accessible
  await Promise.all(allowedDirectories.map(async (dir) => {
    try {
      const stats = await fs.stat(dir);
      if (!stats.isDirectory()) {
        throw new Error(`${dir} is not a directory`);
      }
    } catch (error) {
      throw new Error(`Error accessing directory ${dir}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }));

  // Initialize the global allowedDirectories in lib.ts
  setAllowedDirectories(allowedDirectories);
}

// Schema definitions
const ReadTextFileArgsSchema = z.object({
  path: z.string(),
  tail: z.number().nullable().describe('If provided, returns only the last N lines of the file'),
  head: z.number().nullable().describe('If provided, returns only the first N lines of the file')
});

const ReadMediaFileArgsSchema = z.object({
  path: z.string()
});

const ReadPdfFileArgsSchema = z.object({
  path: z.string()
});

const ReadMultipleFilesArgsSchema = z.object({
  paths: z
    .array(z.string())
    .min(1, "At least one file path must be provided")
    .describe("Array of file paths to read. Each path must be a string pointing to a valid file within allowed directories."),
});

const WriteFileArgsSchema = z.object({
  path: z.string(),
  content: z.string(),
});

const EditOperation = z.object({
  oldText: z.string().describe('Text to search for - must match exactly'),
  newText: z.string().describe('Text to replace with')
});

const EditFileArgsSchema = z.object({
  path: z.string(),
  edits: z.array(EditOperation),
  dryRun: z.boolean().nullable().default(false).describe('Preview changes using git-style diff format')
});

const CreateDirectoryArgsSchema = z.object({
  path: z.string(),
});

const ListDirectoryArgsSchema = z.object({
  path: z.string(),
});

const ListDirectoryWithSizesArgsSchema = z.object({
  path: z.string(),
  sortBy: z.enum(['name', 'size']).nullable().default('name').describe('Sort entries by name or size'),
});

const DirectoryTreeArgsSchema = z.object({
  path: z.string(),
  excludePatterns: z.array(z.string()).nullable().default([])
});

const MoveFileArgsSchema = z.object({
  source: z.string(),
  destination: z.string(),
});

const SearchFilesArgsSchema = z.object({
  path: z.string(),
  pattern: z.string(),
  excludePatterns: z.array(z.string()).nullable().default([])
});

const GetFileInfoArgsSchema = z.object({
  path: z.string(),
});

// Reads a file as a stream of buffers, concatenates them, and then encodes
// the result to a Base64 string. This is a memory-efficient way to handle
// binary data from a stream before the final encoding.
async function readFileAsBase64Stream(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => {
      chunks.push(chunk as Buffer);
    });
    stream.on('end', () => {
      const finalBuffer = Buffer.concat(chunks);
      resolve(finalBuffer.toString('base64'));
    });
    stream.on('error', (err) => reject(err));
  });
}

const toolsList = [
      {
        name: "read_file",
        description: "Read the complete contents of a file as text. DEPRECATED: Use read_text_file instead.",
        parameters: ReadTextFileArgsSchema,
      },
      {
        name: "read_text_file",
        description:
          "Read the complete contents of a file from the file system as text. " +
          "Handles various text encodings and provides detailed error messages " +
          "if the file cannot be read. Use this tool when you need to examine " +
          "the contents of a single file. Use the 'head' parameter to read only " +
          "the first N lines of a file, or the 'tail' parameter to read only " +
          "the last N lines of a file. Operates on the file as text regardless of extension. " +
          "Only works within allowed directories.",
        parameters: ReadTextFileArgsSchema,
      },
      {
        name: "read_media_file",
        description:
          "Read an image or audio file. Returns the base64 encoded data and MIME type. " +
          "Only works within allowed directories.",
        parameters: ReadMediaFileArgsSchema,
      },
      {
        name: "read_pdf_file",
        description:
          "Read the text content of a PDF file. Use this when you need to read " +
          "a .pdf file to understand its contents. Returns the extracted text. " +
          "Only works within allowed directories.",
        parameters: ReadPdfFileArgsSchema,
      },
      {
        name: "read_multiple_files",
        description:
          "Read the contents of multiple files simultaneously. This is more " +
          "efficient than reading files one by one when you need to analyze " +
          "or compare multiple files. Each file's content is returned with its " +
          "path as a reference. Failed reads for individual files won't stop " +
          "the entire operation. Only works within allowed directories.",
        parameters: ReadMultipleFilesArgsSchema,
      },
      {
        name: "write_file",
        description:
          "Create a new file or completely overwrite an existing file with new content. " +
          "Use with caution as it will overwrite existing files without warning. " +
          "Handles text content with proper encoding. Only works within allowed directories.",
        parameters: WriteFileArgsSchema,
      },
      {
        name: "edit_file",
        description:
          "Make line-based edits to a text file. Each edit replaces exact line sequences " +
          "with new content. Returns a git-style diff showing the changes made. " +
          "Only works within allowed directories.",
        parameters: EditFileArgsSchema,
      },
      {
        name: "create_directory",
        description:
          "Create a new directory or ensure a directory exists. Can create multiple " +
          "nested directories in one operation. If the directory already exists, " +
          "this operation will succeed silently. Perfect for setting up directory " +
          "structures for projects or ensuring required paths exist. Only works within allowed directories.",
        parameters: CreateDirectoryArgsSchema,
      },
      {
        name: "list_directory",
        description:
          "Get a detailed listing of all files and directories in a specified path. " +
          "Results clearly distinguish between files and directories with [FILE] and [DIR] " +
          "prefixes. This tool is essential for understanding directory structure and " +
          "finding specific files within a directory. Only works within allowed directories.",
        parameters: ListDirectoryArgsSchema,
      },
      {
        name: "list_directory_with_sizes",
        description:
          "Get a detailed listing of all files and directories in a specified path, including sizes. " +
          "Results clearly distinguish between files and directories with [FILE] and [DIR] " +
          "prefixes. This tool is useful for understanding directory structure and " +
          "finding specific files within a directory. Only works within allowed directories.",
        parameters: ListDirectoryWithSizesArgsSchema,
      },
      {
        name: "directory_tree",
        description:
            "Get a recursive tree view of files and directories as a JSON structure. " +
            "Each entry includes 'name', 'type' (file/directory), and 'children' for directories. " +
            "Files have no children array, while directories always have a children array (which may be empty). " +
            "The output is formatted with 2-space indentation for readability. Only works within allowed directories.",
        parameters: DirectoryTreeArgsSchema,
      },
      {
        name: "move_file",
        description:
          "Move or rename files and directories. Can move files between directories " +
          "and rename them in a single operation. If the destination exists, the " +
          "operation will fail. Works across different directories and can be used " +
          "for simple renaming within the same directory. Both source and destination must be within allowed directories.",
        parameters: MoveFileArgsSchema,
      },
      {
        name: "search_files",
        description:
          "Recursively search for files and directories matching a pattern. " +
          "The patterns should be glob-style patterns that match paths relative to the working directory. " +
          "Use pattern like '*.ext' to match files in current directory, and '**/*.ext' to match files in all subdirectories. " +
          "Returns full paths to all matching items. Great for finding files when you don't know their exact location. " +
          "Only searches within allowed directories.",
        parameters: SearchFilesArgsSchema,
      },
      {
        name: "get_file_info",
        description:
          "Retrieve detailed metadata about a file or directory. Returns comprehensive " +
          "information including size, creation time, last modified time, permissions, " +
          "and type. This tool is perfect for understanding file characteristics " +
          "without reading the actual content. Only works within allowed directories.",
        parameters: GetFileInfoArgsSchema,
      },
      {
        name: "list_allowed_directories",
        description:
          "Returns the list of directories that this server is allowed to access. " +
          "Subdirectories within these allowed directories are also accessible. " +
          "Use this to understand which directories and their nested paths are available " +
          "before trying to access files.",
        parameters: z.object({}),
      },  
    ];


interface ToolCall {
  name: string
  arguments: any
}

export const fileSystemTools = toolsList.map((fileTool) => 
  tool({
    name: fileTool.name,
    description: fileTool.description,
    parameters: fileTool.parameters,
    execute: (args) => handleToolCall({ name: fileTool.name, arguments: args })
  })
)  

export const handleToolCall = async ({name, arguments: args}: ToolCall) => {
  try {
    switch (name) {
      case "read_file":
      case "read_text_file": {
        console.log("Text file read request from server: ", args)
        const parsed = ReadTextFileArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for read_text_file: ${parsed.error}`);
        }
        const validPath = await validatePath(parsed.data.path);

        const tail = parsed.data.tail ?? undefined;
        const head = parsed.data.head ?? undefined;

        if (head && tail) {
          throw new Error("Cannot specify both head and tail parameters simultaneously");
        }

        if (tail) {
          // Use memory-efficient tail implementation for large files
          const tailContent = await tailFile(validPath, tail);
          return {
            content: [{ type: "text", text: tailContent }],
          };
        }

        if (head) {
          // Use memory-efficient head implementation for large files
          const headContent = await headFile(validPath, head);
          return {
            content: [{ type: "text", text: headContent }],
          };
        }
        const content = await readFileContent(validPath);
        return {
          content: [{ type: "text", text: content }],
        };
      }

      case "read_media_file": {
        console.log("Media file read request from server: ", args)
        const parsed = ReadMediaFileArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for read_media_file: ${parsed.error}`);
        }
        const validPath = await validatePath(parsed.data.path);
        const extension = path.extname(validPath).toLowerCase();
        const mimeTypes: Record<string, string> = {
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".gif": "image/gif",
          ".webp": "image/webp",
          ".bmp": "image/bmp",
          ".svg": "image/svg+xml",
          ".mp3": "audio/mpeg",
          ".wav": "audio/wav",
          ".ogg": "audio/ogg",
          ".flac": "audio/flac",
        };
        const mimeType = mimeTypes[extension] || "application/octet-stream";
        const data = await readFileAsBase64Stream(validPath);
        const type = mimeType.startsWith("image/")
          ? "image"
          : mimeType.startsWith("audio/")
            ? "audio"
            : "blob";
        return {
          content: [{ type, data, mimeType }],
        };
      }

      case "read_pdf_file": {
        const parsed = ReadPdfFileArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for read_pdf_file: ${parsed.error}`);
        }
        const validPath = await validatePath(parsed.data.path);
        
        // Read file as buffer
        const buffer = await fs.readFile(validPath);
        try {
          const data = await pdf(buffer);
          return {
            content: [{ type: "text", text: data.text }],
          };
        } catch (error) {
          throw new Error(`Failed to parse PDF file: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      case "read_multiple_files": {
        const parsed = ReadMultipleFilesArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for read_multiple_files: ${parsed.error}`);
        }
        const results = await Promise.all(
          parsed.data.paths.map(async (filePath: string) => {
            try {
              const validPath = await validatePath(filePath);
              const content = await readFileContent(validPath);
              return `${filePath}:\n${content}\n`;
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              return `${filePath}: Error - ${errorMessage}`;
            }
          }),
        );
        return {
          content: [{ type: "text", text: results.join("\n---\n") }],
        };
      }

      case "write_file": {
        const parsed = WriteFileArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for write_file: ${parsed.error}`);
        }
        const validPath = await validatePath(parsed.data.path);
        await writeFileContent(validPath, parsed.data.content);
        return {
          content: [{ type: "text", text: `Successfully wrote to ${parsed.data.path}` }],
        };
      }

      case "edit_file": {
        const parsed = EditFileArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for edit_file: ${parsed.error}`);
        }
        const validPath = await validatePath(parsed.data.path);
        // @ts-ignore - Zod type inference mismatch with interface
        const result = await applyFileEdits(validPath, parsed.data.edits, parsed.data.dryRun ?? false);
        return {
          content: [{ type: "text", text: result }],
        };
      }

      case "create_directory": {
        const parsed = CreateDirectoryArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for create_directory: ${parsed.error}`);
        }
        const validPath = await validatePath(parsed.data.path);
        await fs.mkdir(validPath, { recursive: true });
        return {
          content: [{ type: "text", text: `Successfully created directory ${parsed.data.path}` }],
        };
      }

      case "list_directory": {
        const parsed = ListDirectoryArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for list_directory: ${parsed.error}`);
        }
        const validPath = await validatePath(parsed.data.path);
        const entries = await fs.readdir(validPath, { withFileTypes: true });
        const formatted = entries
          .map((entry) => `${entry.isDirectory() ? "[DIR]" : "[FILE]"} ${entry.name}`)
          .join("\n");
        return {
          content: [{ type: "text", text: formatted }],
        };
      }

      case "list_directory_with_sizes": {
        const parsed = ListDirectoryWithSizesArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for list_directory_with_sizes: ${parsed.error}`);
        }
        const validPath = await validatePath(parsed.data.path);
        const entries = await fs.readdir(validPath, { withFileTypes: true });

        // Get detailed information for each entry
        const detailedEntries = await Promise.all(
          entries.map(async (entry) => {
            const entryPath = path.join(validPath, entry.name);
            try {
              const stats = await fs.stat(entryPath);
              return {
                name: entry.name,
                isDirectory: entry.isDirectory(),
                size: stats.size,
                mtime: stats.mtime
              };
            } catch (error) {
              return {
                name: entry.name,
                isDirectory: entry.isDirectory(),
                size: 0,
                mtime: new Date(0)
              };
            }
          })
        );

        // Sort entries based on sortBy parameter
        const sortBy = parsed.data.sortBy ?? 'name';
        const sortedEntries = [...detailedEntries].sort((a, b) => {
          if (sortBy === 'size') {
            return b.size - a.size; // Descending by size
          }
          // Default sort by name
          return a.name.localeCompare(b.name);
        });

        // Format the output
        const formattedEntries = sortedEntries.map(entry =>
          `${entry.isDirectory ? "[DIR]" : "[FILE]"} ${entry.name.padEnd(30)} ${
            entry.isDirectory ? "" : formatSize(entry.size).padStart(10)
          }`
        );

        // Add summary
        const totalFiles = detailedEntries.filter(e => !e.isDirectory).length;
        const totalDirs = detailedEntries.filter(e => e.isDirectory).length;
        const totalSize = detailedEntries.reduce((sum, entry) => sum + (entry.isDirectory ? 0 : entry.size), 0);

        const summary = [
          "",
          `Total: ${totalFiles} files, ${totalDirs} directories`,
          `Combined size: ${formatSize(totalSize)}`
        ];

        return {
          content: [{
            type: "text",
            text: [...formattedEntries, ...summary].join("\n")
          }],
        };
      }

      case "directory_tree": {
        const parsed = DirectoryTreeArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for directory_tree: ${parsed.error}`);
        }

        interface TreeEntry {
            name: string;
            type: 'file' | 'directory';
            children?: TreeEntry[];
        }
        const rootPath = parsed.data.path;

        async function buildTree(currentPath: string, excludePatterns: string[] = []): Promise<TreeEntry[]> {
            const validPath = await validatePath(currentPath);
            const entries = await fs.readdir(validPath, {withFileTypes: true});
            const result: TreeEntry[] = [];

            for (const entry of entries) {
                const relativePath = path.relative(rootPath, path.join(currentPath, entry.name));
                const shouldExclude = excludePatterns.some(pattern => {
                    if (pattern.includes('*')) {
                        return minimatch(relativePath, pattern, {dot: true});
                    }
                    // For files: match exact name or as part of path
                    // For directories: match as directory path
                    return minimatch(relativePath, pattern, {dot: true}) ||
                            minimatch(relativePath, `**/${pattern}`, {dot: true}) ||
                            minimatch(relativePath, `**/${pattern}/**`, {dot: true});
                });
                if (shouldExclude)
                    continue;

                const entryData: TreeEntry = {
                    name: entry.name,
                    type: entry.isDirectory() ? 'directory' : 'file'
                };

                if (entry.isDirectory()) {
                    const subPath = path.join(currentPath, entry.name);
                    entryData.children = await buildTree(subPath, excludePatterns);
                }

                result.push(entryData);
            }

            return result;
        }

        const treeData = await buildTree(rootPath, parsed.data.excludePatterns ?? []);
        return {
            content: [{
                type: "text",
                text: JSON.stringify(treeData, null, 2)
            }],
        };
      }

      case "move_file": {
        const parsed = MoveFileArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for move_file: ${parsed.error}`);
        }
        const validSourcePath = await validatePath(parsed.data.source);
        const validDestPath = await validatePath(parsed.data.destination);
        await fs.rename(validSourcePath, validDestPath);
        return {
          content: [{ type: "text", text: `Successfully moved ${parsed.data.source} to ${parsed.data.destination}` }],
        };
      }

      case "search_files": {
        const parsed = SearchFilesArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for search_files: ${parsed.error}`);
        }
        const validPath = await validatePath(parsed.data.path);
        const results = await searchFilesWithValidation(validPath, parsed.data.pattern, getAllowedDirectories(), { excludePatterns: parsed.data.excludePatterns ?? [] });
        return {
          content: [{ type: "text", text: results.length > 0 ? results.join("\n") : "No matches found" }],
        };
      }

      case "get_file_info": {
        const parsed = GetFileInfoArgsSchema.safeParse(args);
        if (!parsed.success) {
          throw new Error(`Invalid arguments for get_file_info: ${parsed.error}`);
        }
        const validPath = await validatePath(parsed.data.path);
        const info = await getFileStats(validPath);
        return {
          content: [{ type: "text", text: Object.entries(info)
            .map(([key, value]) => `${key}: ${value}`)
            .join("\n") }],
        };
      }

      case "list_allowed_directories": {
        return {
          content: [{
            type: "text",
            text: `Allowed directories:\n${getAllowedDirectories().join('\n')}`
          }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
};