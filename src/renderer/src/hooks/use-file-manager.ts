// hook to manage file operations: load, add, update, delete, export
// maintains local state of directory and files, syncs with server
import { useState, useEffect, useRef } from 'react';

import { File, PathTree } from 'src/types';
import { createFileInPathTree, deleteFileFromPathTree } from '../../../lib/file';
// import { flattenDir } from '@renderer/lib/file';
import useLogger from '@renderer/hooks/use-logger';
 

type ActiveFile = File | null;

export type DirEditRsp = {
  nextDirState: PathTree;
  success: boolean
  file?: File;
}

export type ManagedFileSystem = {
  dir: PathTree;
  setDir: React.Dispatch<React.SetStateAction<PathTree>>;
  getFile: (path: string) => Promise<DirEditRsp>;
  updateFile: (path: string, content: string) => Promise<DirEditRsp>;
  deleteFile: (path: string) => Promise<DirEditRsp>;
  addFile: (path: string, content: string) => Promise<DirEditRsp>;
  pullFileSystem: () => Promise<DirEditRsp>;
}

function concatFilePath(folder: string, filePath: string): string {
  return folder?.split('/').slice(0, -1).join('/') + '/' + filePath;
}

function baseName(filePath: string): string {
  return filePath.split('/').pop() || filePath;
}

// Hook to manage a directory and maintain sync with server.
function useManageFiles(folder: string | null): ManagedFileSystem {
  const [dir, setDir] = useState<PathTree>({ title: baseName(folder || ""), pathType: 'dir', children: [] });
  const logger = useLogger();

  // // On load pull current file system from cloud.
  useEffect(() => {
    console.log("Initializing file system for folder:", folder); 
    const initialPull = async() => {
      await pullFileSystem();
    }
    initialPull();
  }, [])

  // Pull the file system from the server and update local state.
  async function pullFileSystem(): Promise<DirEditRsp> {
    console.log("Pulling file system for folder:", folder);
    if ( folder ) {
      const nextDirState: PathTree = await window.electron.ipcRenderer.invoke('pull-file-system', folder);
      setDir(nextDirState);

      return {nextDirState, success: true};
    }
    return {nextDirState: dir, success: false};
  }
  
  // Get a file at the path from the local store.
  async function getFile(path: string): Promise<DirEditRsp> {
    console.log("dir Getting file:", path);

    const fullPath = concatFilePath(folder || '', path);

    let content = await window.electron.ipcRenderer.invoke('read-file', fullPath);
    return {nextDirState: dir, success: content !== null, file: content !== null ? {path, content} : undefined};
  }

  // Update a file at the path for the local store.
  async function updateFile(filePath: string, content: string): Promise<DirEditRsp> {
    console.log("dir Updating file:", filePath);

    filePath = concatFilePath(folder || '', filePath);

    await window.electron.ipcRenderer.invoke('update-file', filePath, content);
    logger.editedFileLog(filePath);

    return {nextDirState: dir,  success: true};
  }

  // Add a file at the path for the local store.
  async function addFile(filePath: string, content: string): Promise<DirEditRsp> {
    console.log("dir Adding file:", filePath, content);

    const nextDirState = {...dir}

    
    createFileInPathTree({path: filePath, content: ''} , nextDirState) // add to local dir 
    const fullPath = concatFilePath(folder || '', filePath);
    await window.electron.ipcRenderer.invoke('add-file', fullPath, content); // add to server

    setDir(nextDirState);
    logger.createdFileLog(filePath);

    return {nextDirState, success: true}
  }

  // Delete a file at the path for the local store.
  async function deleteFile(filePath: string): Promise<DirEditRsp> {
    console.log("dir Deleting file:", filePath);
    const nextDirState = {...dir}

    const success = deleteFileFromPathTree(filePath, nextDirState); // delete from local dir
    const fullPath = concatFilePath(folder || '', filePath);
    await window.electron.ipcRenderer.invoke('delete-file', fullPath); // delete from server
    setDir(nextDirState);
    logger.deletedFileLog(filePath);

    return {nextDirState,  success}
  }

  return {
    dir,
    setDir,
    getFile,
    updateFile,
    deleteFile,
    addFile,
    pullFileSystem,
  }
}

export type ManageActiveFile = {
  getFile: () => File | null;
  getDir: () => ManagedFileSystem | null;
  isEdited: () => boolean;
  resetActiveFileState: () => void;
  nextActiveFileState: () => void;
  setFile: (path: string) => void;
}

// Hook to manage the currently active file being edited.
function useManageActiveFile(dir: ManagedFileSystem[]) {
  const [activeFile, setActiveFile] = useState<ActiveFile>(null);

  const activeDir = useRef<ManagedFileSystem | null>(null);
  useEffect(() => { activeDir.current = dir.find(mfs => mfs.dir.title === activeFile?.path.split('/')[0]) || null; }, [dir, activeFile]);

  const activeFileState = useRef<'none' | 'set' | 'updated'>("none");
  const debounce = useRef<number>(Date.now());
  const logger = useLogger();

  function isEdited(): boolean {
    if ( !activeFile || !activeDir ) return false;
    if ( activeFileState.current !== 'updated' ) return false;
    return true;
  }

  function resetActiveFileState() {
    activeFileState.current = 'none';
  }

  function nextActiveFileState() {
    if ( Date.now() - debounce.current < 100) return;
    debounce.current = Date.now();

    if (activeFileState.current === 'none') {
      activeFileState.current = 'set';
    } else if (activeFileState.current === 'set') {
      activeFileState.current = 'updated';
    }
  }

  async function setFile(path: string, content: string) {
    const dirName = path.split('/')[0];
    
    // O(n) fine since files should be limited in number
    const pathMfs = dir.find(mfs => {
      return mfs.dir.title === dirName
    });

    if ( !pathMfs ) return;

    setActiveFile({path, content});
    logger.switchedActiveFileLog(path);
    activeDir.current = pathMfs;
  }

  function unset() {
    setActiveFile(null);
    activeDir.current = null;
  }

  function getDir(): ManagedFileSystem | null {
    return activeDir.current;
  }

  return {
    activeFile,
    getDir,
    isEdited,
    resetActiveFileState,
    nextActiveFileState,
    setFile,
    unset,
  }
}

export type VirtualManagedFileSystem = {
  virtualDir: PathTree;
  getFile: (path: string) =>  Promise<DirEditRsp>;
  updateFile: (path: string, content: string) => Promise<DirEditRsp>;
  deleteFile: (path: string) => Promise<DirEditRsp>;
  addFile: (path: string, content: string) => Promise<DirEditRsp>;
  pullFileSystem: () => Promise<DirEditRsp>;
}

// Put all directories into a virtual directory.
function useVirtualDirectory(projectName: string, dirs: ManagedFileSystem[]): VirtualManagedFileSystem {
  const managedFileSystems = dirs;

  const virtualDir: PathTree = {title: projectName, pathType: 'dir', children: dirs.map(mfs => mfs.dir)};

  function _consolidateDirRsp(rsp: DirEditRsp): DirEditRsp {
    const nextVirtualDirState = { ...virtualDir };
    const dirIndex = managedFileSystems.findIndex(mfs => mfs.dir.title === rsp.nextDirState.title);
    if ( dirIndex === -1 ) {
      return {nextDirState: virtualDir, success: false};
    }

    if ( nextVirtualDirState.children ) nextVirtualDirState.children[dirIndex] = rsp.nextDirState;
    return {nextDirState: nextVirtualDirState, success: rsp.success, file: rsp.file};
  }

  async function _useManageFilesWrapper(command: string, filePath: string, content?: string): Promise<DirEditRsp> {
    const pathSplit = filePath.split('/');
    if ( pathSplit[0] === projectName ) pathSplit.shift(); // remove project title;
    const dirTitle = pathSplit[0];
    filePath = pathSplit.join('/');

    const mfsResults = managedFileSystems.find(mfs => mfs.dir.title === dirTitle);
    if ( mfsResults ) {
      switch(command) {
        case 'get': {
          const rsp = await mfsResults.getFile(filePath);
          return _consolidateDirRsp(rsp);
        }
        case 'update': {
          if ( content === undefined ) return {nextDirState: virtualDir, success: false};
          const rsp = await mfsResults.updateFile(filePath, content);
          return _consolidateDirRsp(rsp);
        }
        case 'delete': {
          const rsp = await mfsResults.deleteFile(filePath);
          return _consolidateDirRsp(rsp);
        }
        case 'add':
          if ( content === undefined ) return {nextDirState: virtualDir, success: false};
          const rsp = await mfsResults.addFile(filePath, content);
          return _consolidateDirRsp(rsp);
      }
    }

    return {nextDirState: virtualDir, success: false};
  }

  async function getFile(filePath: string): Promise<DirEditRsp> {
    return await _useManageFilesWrapper('get', filePath);
  }

  async function updateFile(filePath: string, content: string): Promise<DirEditRsp> {
    return await _useManageFilesWrapper('update', filePath, content);
  }

  async function deleteFile(filePath: string): Promise<DirEditRsp> {
    return await _useManageFilesWrapper('delete', filePath);
  }

  async function addFile(filePath: string, content: string): Promise<DirEditRsp> {
    return await _useManageFilesWrapper('add', filePath, content);
  }

  async function pullFileSystem(): Promise<DirEditRsp> {
    await Promise.all(managedFileSystems.map(mfs => mfs.pullFileSystem()));
    return _consolidateDirRsp({nextDirState: virtualDir, success: true});
  }


  return {
    virtualDir,
    updateFile,
    getFile,
    deleteFile,
    addFile,
    pullFileSystem,
  };
}

export { useManageFiles, useManageActiveFile, useVirtualDirectory };
