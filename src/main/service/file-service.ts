
import { writeFileSync, unlinkSync, statSync } from 'fs';
import fs from 'fs';
import path from 'path';
import { Dir, Doc } from '../../types';
import { readFile, readdir } from 'fs';
import exec from 'child_process';
import { ipcMain, dialog } from 'electron';
import { app } from 'electron';
import { IpcMainEvent } from 'electron';

// TODO: ensure no files outside public are ever updated. Security risk.

async function getRootPath() {
  return import.meta.env.VITE_ROOT_DIR;
}

async function getFileSystem(folder: string): Promise<Dir> {
  return new Promise((resolve, reject) => {
    readdir(folder, (err, files) => {
      if (err) {
        console.error(`Error reading ${folder} directory:`, err);
        return reject(err);
      }

      // Filter out system files and hidden files
      const validFiles = files.filter(file => 
        !file.startsWith('.') && 
        !file.startsWith('~') &&
        file.length > 0
      );

      const root: Dir = { title: path.basename(folder), children: [] };

      // Create promises for reading each file
      const fileReadPromises = validFiles.map(file => {
        return new Promise<void>((fileResolve, fileReject) => {
          const fullPath = path.join(folder, file);
          if( statSync(fullPath).isFile()) {
            readFile(fullPath, (err, data) => {
              if (err) {
                console.error(`Error reading file ${fullPath}:`, err);
                fileReject(err);
              } else {
                root.children.push({ title: file, content: data.toString() });
                fileResolve();
              }
            });
          } else {
            // It's a directory, recurse into it
            getFileSystem(path.join(folder, file)).then(subDirs => {
              root.children.push({ title: file, children: subDirs.children });
              fileResolve();
            }).catch(fileReject);
          }
        });
      });

      // Wait for all files to be read before resolving
      Promise.all(fileReadPromises)
        .then(() => {
          resolve(root);
        })
        .catch(reject);
    });
  });
}

async function setFileSystem(dir: Dir, folder: string) {
  console.log("Setting file system for folder: ", folder);
  const serverDir = await getFileSystem(folder);

  // Delete files that are on server but not in dir
  for ( const serverFile of serverDir.children ) {
    const file = dir.children.find(f => f.title === serverFile.title);
    if ( !file ) {
      await deleteFile(serverFile.title, folder);
    } else if ( 'children' in serverFile && 'children' in file ) {
      await setFileSystem(file, path.join(folder, file.title));
    }
  }

  // Update or add files from dir to server
  for ( const file of dir.children ) {
    if ( 'content' in file ) {
      await updateFile(file, folder);
    } else if ( 'children' in file ) {
      const subFolder = path.join(folder, file.title);
      try {
        statSync(subFolder);
      } catch (error) {
        // Directory does not exist, create it
        fs.mkdirSync(subFolder);
      }
      await setFileSystem(file, subFolder);
    }
  }
}

async function deleteFile(title: string, folder: string) {
  const filePath = path.join(folder, title);
  try {
    unlinkSync(filePath);
    console.log(`Successfully deleted ${title}`);
  } catch (error) {
    console.error(`Error deleting file ${title} in ${filePath}:`, error);
  }
}

async function updateFile(doc: Doc, folder: string) {
  const filePath = path.join(folder, doc.title);
  try {
    writeFileSync(filePath, doc.content, { flag: 'w' });
  } catch (error) {
    console.error(`Error updating file ${doc.title} in ${filePath}:`, error);
  }
}

async function exportHtmlToPdf(htmlPath: string, htmlContent: string) {
  const tempFolder = app.getPath('userData');
  const desktopPath = app.getPath('desktop');
  
  if ( !htmlContent || !htmlPath ) {
    console.error('No HTML content provided');
    return;
  }

  const fileName = path.parse(htmlPath).name;

  const timeStamp = Date.now();
  const outputFilePath = path.join(desktopPath, fileName + ".pdf");
  const tempFilePath = path.join(tempFolder, `${fileName}_${timeStamp}.html`);
  const command = `html2pdf "${tempFilePath}" --background --output "${outputFilePath}"`;

  writeFileSync(tempFilePath, htmlContent);

  exec.exec(command, (error, stdout, stderr) => {
    unlinkSync(tempFilePath);
    if (error) {
      console.error(`Error executing command: ${error}`);
      return;
    }
    console.log(`Command output: ${stdout}`);
  });
}

export default function setUpFileSystemHandlers() {
  ipcMain.handle('pull-file-system', async (_, path) => {
    const fileSystem = await getFileSystem(path);
    return fileSystem;
  })

  ipcMain.handle('push-file-system', async (_, dir, folder) => {
    await setFileSystem(dir, folder);
  })

  ipcMain.handle('select-folder', async (_, projectName: string) => {
      const folder = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
      return folder;
  })

  ipcMain.handle('get-root-path', async () => {
    const rootPath = await getRootPath();
    return rootPath;
  })

  ipcMain.handle('export-html-to-pdf', async (_, formData: { filePath: string, content: string }) => {
    await exportHtmlToPdf(formData.filePath, formData.content);
  })
}
