// hook to manage file operations: load, add, update, delete, export
// maintains local state of directory and files, syncs with server
import { useState, useEffect, useCallback, useRef, useReducer, use } from 'react';

import { Dir, File } from 'src/types';
import { readFileInDir, createFileInDir, deleteFileFromDir, updateFileInDir, alphabetizeDir } from '../../../lib/file';
// import { flattenDir } from '@renderer/lib/file';
import useLogger from '@renderer/hooks/use-logger';
 

type ActiveFile = File | null;

export type DirEditRsp = {
  nextDirState: Dir;
  success: boolean
  file?: File;
}

export type ManagedFileSystem = {
  dir: Dir;
  setDir: React.Dispatch<React.SetStateAction<Dir>>;
  getFile: (path: string) => DirEditRsp;
  updateFile: (path: string, content: string) => DirEditRsp;
  deleteFile: (path: string) => DirEditRsp;
  addFile: (path: string, content: string) => DirEditRsp;
  pullFileSystem: () => Promise<DirEditRsp>;
  pushFileSystem: () => Promise<void>;
}

function baseName(filePath: string): string {
  return filePath.split('/').pop() || filePath;
}

// Hook to manage a directory and maintain sync with server.
function useManageFiles(folder: string | null): ManagedFileSystem {
  const [dir, setDir] = useState<Dir>({ title: baseName(folder || ""), children: [] });
  const dirIsInitialized = useRef(false);
  const [pushLockout, setPushLockout] = useState<number>(0);
  const logger = useLogger();

  // // On load pull current file system from cloud.
  useEffect(() => {
    console.log("Initializing file system for folder:", folder); 
    const initialPull = async() => {
      const rsp = await pullFileSystem();
    }
    initialPull();
  }, [])

  // // If local files change push local dir state to cloud.
  useEffect(() => {
    if ( !dirIsInitialized.current ) { dirIsInitialized.current = true; return; };
    if ( pushLockout > 0 ) {
      setPushLockout(pushLockout - 1);
    } else {
      pushFileSystem();
    }
  }, [dir]);

  const pushFileSystem = useCallback(async () => {
    console.log("Pushing file system for folder:", folder);
    if ( folder ) {
      await window.electron.ipcRenderer.invoke('push-file-system', dir, folder);
    }
  }, [dir, folder]);

  async function pullFileSystem(): Promise<DirEditRsp> {
    console.log("Pulling file system for folder:", folder);
    setPushLockout(pushLockout + 1);
    if ( folder ) {
      console.log("folder: ", folder);
      const nextDirState: Dir = await window.electron.ipcRenderer.invoke('pull-file-system', folder);
      
      setDir(nextDirState);

      return {nextDirState, success: true};
    }
    return {nextDirState: dir, success: false};
  }
  
  // Get a file at the path from the local store.
  function getFile(path: string): DirEditRsp {
    console.log("dir Getting file:", path);
    const file = readFileInDir(path, dir);
    return {nextDirState: dir, success: file ? true : false, file: file ? file : undefined}
  }

  // Update a file at the path for the local store.
  function updateFile(filePath: string, content: string): DirEditRsp {
    console.log("dir Updating file:", filePath);
    const nextDirState = {...dir};
    let file = readFileInDir(filePath, nextDirState);
    if ( !file ) throw new Error(`File ${filePath} not found for update`);
    file.content = content;
    updateFileInDir(file, nextDirState);
    setDir(nextDirState);
    logger.editedFileLog(filePath);

    return {nextDirState,  success: true};
  }

  // Add a file at the path for the local store.
  function addFile(filePath: string, content: string): DirEditRsp {
    console.log("dir Adding file:", filePath, content);
    const nextDirState = {...dir}
    let existingFile = readFileInDir(filePath, nextDirState);

    if ( existingFile ) {
      existingFile.content = content;
    } else {
      createFileInDir({path: filePath, content} ,nextDirState)
    }

    setDir(nextDirState);
    logger.createdFileLog(filePath);

    return {nextDirState, success: true}
  }

  // Delete a file at the path for the local store.
  function deleteFile(filePath: string): DirEditRsp {
    console.log("dir Deleting file:", filePath);
    const nextDirState = {...dir}
    const success = deleteFileFromDir(filePath, nextDirState);
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
    pushFileSystem,
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

    // Keep active file in sync with directory when dir is updated externally.
  useEffect(() => {
    console.log("Syncing active file with dir update.");
    // If no active file, nothing to sync; ensure editor update state is reset
    if (!activeFile || !activeDir?.current?.dir ) {
      resetActiveFileState();
      return;
    }

    const freshActiveFile = readFileInDir(activeFile.path, activeDir?.current?.dir);
    if (!freshActiveFile) {
      // File no longer exists in the updated dir
      setActiveFile(null);
      resetActiveFileState();
      return;
    }

    // If content changed in the dir (e.g., after a pull), update the active file to reflect it
    if (freshActiveFile.content !== activeFile.content) {
      setActiveFile(freshActiveFile);
    }
  }, [dir])

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

  function setFile(path: string) {
    const dirName = path.split('/')[0];
    
    // O(n) fine since files should be limited in number
    const pathMfs = dir.find(mfs => {
      return mfs.dir.title === dirName
    });

    if ( !pathMfs ) return;

    const file = readFileInDir(path, pathMfs.dir)
    setActiveFile(file);
    logger.switchedActiveFileLog(path);
    activeDir.current = pathMfs;
  }

  function getFile(): File | null {
    return activeFile;
  }

  function getDir(): ManagedFileSystem | null {
    return activeDir.current;
  }

  return {
    getFile,
    getDir,
    isEdited,
    resetActiveFileState,
    nextActiveFileState,
    setFile,
  }
}

export type VirtualManagedFileSystem = {
  virtualDir: Dir;
  getFile: (path: string) => DirEditRsp;
  updateFile: (path: string, content: string) => DirEditRsp;
  deleteFile: (path: string) => DirEditRsp;
  addFile: (path: string, content: string) => DirEditRsp;
  pullFileSystem: () => Promise<DirEditRsp>;
  pushFileSystem: () => Promise<void>;
}

// Put all directories into a virtual directory.
function useVirtualDirectory(projectName: string, dirs: ManagedFileSystem[]): VirtualManagedFileSystem {
  const managedFileSystems = dirs;

  const virtualDir = {title: projectName, children: dirs.map(mfs => mfs.dir)};

  function _consolidateDirRsp(rsp: DirEditRsp): DirEditRsp {
    const nextVirtualDirState = { ...virtualDir };
    const dirIndex = managedFileSystems.findIndex(mfs => mfs.dir.title === rsp.nextDirState.title);
    if ( dirIndex === -1 ) {
      return {nextDirState: virtualDir, success: false};
    }

    nextVirtualDirState.children[dirIndex] = rsp.nextDirState;
    return {nextDirState: nextVirtualDirState, success: rsp.success};
  }

  function _useManageFilesWrapper(command: string, filePath: string, content?: string): DirEditRsp {
    const pathSplit = filePath.split('/');
    if ( pathSplit[0] === projectName ) pathSplit.shift(); // remove project title;
    const dirTitle = pathSplit[0];
    filePath = pathSplit.join('/');

    const mfsResults = managedFileSystems.find(mfs => mfs.dir.title === dirTitle);
    if ( mfsResults ) {
      switch(command) {
        case 'get': {
          const rsp = mfsResults.getFile(filePath);
          return _consolidateDirRsp(rsp);
        }
        case 'update': {
          if ( content === undefined ) return {nextDirState: virtualDir, success: false};
          const rsp = mfsResults.updateFile(filePath, content);
          return _consolidateDirRsp(rsp);
        }
        case 'delete': {
          const rsp = mfsResults.deleteFile(filePath);
          return _consolidateDirRsp(rsp);
        }
        case 'add':
          if ( content === undefined ) return {nextDirState: virtualDir, success: false};
          const rsp = mfsResults.addFile(filePath, content);
          return _consolidateDirRsp(rsp);
      }
    }

    return {nextDirState: virtualDir, success: false};
  }

  function getFile(filePath: string): DirEditRsp {
    return _useManageFilesWrapper('get', filePath);
  }

  function updateFile(filePath: string, content: string): DirEditRsp {
    return _useManageFilesWrapper('update', filePath, content);
  }

  function deleteFile(filePath: string): DirEditRsp {
    return _useManageFilesWrapper('delete', filePath);
  }

  function addFile(filePath: string, content: string): DirEditRsp {
    return _useManageFilesWrapper('add', filePath, content);
  }

  async function pullFileSystem(): Promise<DirEditRsp> {
    await Promise.all(managedFileSystems.map(mfs => mfs.pullFileSystem()));
    return _consolidateDirRsp({nextDirState: virtualDir, success: true});
  }

  async function pushFileSystem(): Promise<void> {
    await Promise.all(managedFileSystems.map(mfs => mfs.pushFileSystem()));
  }


  return {
    virtualDir,
    updateFile,
    getFile,
    deleteFile,
    addFile,
    pullFileSystem,
    pushFileSystem,
  };
}

export { useManageFiles, useManageActiveFile, useVirtualDirectory };
