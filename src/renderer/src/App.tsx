import FileTree from './components/file-tree';
import { useState, useEffect, Dispatch, SetStateAction, useCallback, Children } from 'react';
import { useManageFiles, ManagedFileSystem, useManageActiveFile, useVirtualDirectory } from './hooks/use-file-manager';
import { getContentTypeFromPath } from '../../../src/lib/file';
import { DisplayEditor, useTipTapMarkdownEditor } from './components/tiptap-editor/tiptap-templates/simple/simple-editor';
import useCKHtmlEditor from '@renderer/components/ck-editor/ck-editor';
import DisplayCKEditor from '@renderer/components/ck-editor/ck-editor-display';
import PineconeDelicate from '@renderer/components/pinecone-art';
import useLogger from '@renderer/hooks/use-logger';
import ChatWindow from '@renderer/components/chat';
import Split from '@uiw/react-split';
import LeftNav from './components/left-nav';
import SecondaryButton from './components/button';
import Toggle from './components/toggle';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFile,
} from "@fortawesome/free-regular-svg-icons";
import {
  faLink,
  faX,
  faFolderPlus,
  faPlus,
  faFileExport
} from "@fortawesome/free-solid-svg-icons";
import Band from './components/context-container/band';
import ContextContainer from './components/context-container/context-container';
import ChatArea from './components/chat-area';



function App(): React.JSX.Element {
  const [dirsPaths, setDirsPaths] = useState<string[]>([]);
  const [projectDirs, setProjectDirs] = useState<ManagedFileSystem[]>([]);
  const activeFileManager = useManageActiveFile(projectDirs);
  const virtualDir = useVirtualDirectory('Test Project', projectDirs);
  const [showFileTree, setShowFileTree] = useState(true);
  const [showURLs, setShowURLs] = useState(false);
  const [showActiveFile, setShowActiveFile] = useState(false);


  useEffect(() => {
    const cleanup = window.api.mainRequestFileState(() => {
      console.log("Received save request from main process");
      const activeFile = activeFileManager.getFile();
      if (activeFile) {
        const content = extractFileContent();
        virtualDir.updateFile(activeFile.path, content);
        activeFileManager.resetActiveFileState();
      }
    });
    return cleanup;
  }, [activeFileManager, virtualDir])

  const markdownEditor = useTipTapMarkdownEditor(() => activeFileManager.nextActiveFileState());
  const htmlEditor = useCKHtmlEditor(() => activeFileManager.nextActiveFileState());

  const extractFileContent = useCallback(() => {
    const activeFile = activeFileManager.getFile();
    if (!activeFile) return '';
    const contentType = getContentTypeFromPath(activeFile?.path);
    if (contentType === 'markdown') {
      return markdownEditor?.getMarkdown() || '';
    } else {
      return htmlEditor?.editorRef.current?.getData() || '';
    }
  }, [activeFileManager, markdownEditor, htmlEditor]);

    // Whenever active file changes, load its content into the appropriate editor.
  useEffect(() => {
    const contentType = getContentTypeFromPath(activeFileManager.getFile()?.path || '');
    activeFileManager.resetActiveFileState();

    if (contentType === 'markdown' && markdownEditor) {
      const markdownContent = activeFileManager?.getFile()?.content || '';
      markdownEditor?.commands.setContent(markdownContent, {contentType: 'markdown'});
    } else if (contentType === 'html' && htmlEditor?.editorRef.current) {
      const htmlContent = activeFileManager?.getFile()?.content || '';
      htmlEditor?.editorRef.current.setData(htmlContent);
    }
  }, [activeFileManager, markdownEditor, htmlEditor]);

  const handleSwitchActiveFile = useCallback((filePath: string) => {
    if ( activeFileManager.isEdited() ) {
      virtualDir.updateFile(activeFileManager.getFile()?.path || '', extractFileContent());
      activeFileManager.resetActiveFileState();
    }
    setShowActiveFile(true);
    activeFileManager.setFile(filePath);
  }, [extractFileContent, activeFileManager]);

  const handleOnFileDelete = useCallback((filePath: string) => {
    console.log("Deleting file: ", filePath);
    if ( activeFileManager.isEdited() ) {
      virtualDir.updateFile(activeFileManager.getFile()?.path || '', extractFileContent());
      activeFileManager.resetActiveFileState();
    }
    virtualDir.deleteFile(filePath);
  }, [extractFileContent, activeFileManager]);

  const handleOnFileCreate = useCallback((filePath: string) => {
    console.log("Creating file: ", filePath);
    if ( activeFileManager.isEdited() ) {
      virtualDir.updateFile(activeFileManager.getFile()?.path || '', extractFileContent());
      activeFileManager.resetActiveFileState();
    }
    virtualDir.addFile(filePath, 'New file content');
  }, [extractFileContent, virtualDir.addFile]); 

    const handleOnChatRequest = useCallback(async () => {
    if ( activeFileManager.isEdited() ) {
      virtualDir.updateFile(activeFileManager.getFile()?.path || '', extractFileContent());
      activeFileManager.resetActiveFileState();
    }
    await virtualDir.pushFileSystem();
  }, [extractFileContent, virtualDir.updateFile, virtualDir.pushFileSystem]);

  const handleRemoveDir = (path: string) => {
    console.log("Removing directory: ", path);
    setDirsPaths(dirsPaths.filter(p => p !== path));
  };

  const handleAddDir = (path: string) => {
    console.log("Adding directory: ", path);
    if ( !dirsPaths.includes(path) ) {
      setDirsPaths([...dirsPaths, path]);
    }
  }
    const handleFileSelect = async () => {
    const folder = await window.electron.ipcRenderer.invoke("select-folder", "some data");
    if ( folder && folder.filePaths && folder.filePaths.length > 0 ) {
      handleAddDir(folder.filePaths[0]);
    }
  }

  const handleHTMLExport = async () => {
    if ( activeFileManager.isEdited() ) {
      virtualDir.updateFile(activeFileManager.getFile()?.path || '', extractFileContent());
      activeFileManager.resetActiveFileState();
    }
    const formData = {
      filePath: activeFileManager.getFile()?.path || '',
      content: extractFileContent(),
    };
    await window.electron.ipcRenderer.invoke("export-html-to-pdf", formData);
  }

  return (
  <div className="w-screen h-screen flex justify-between">
    <div className="flex flex-row h-full relative z-2 focus-within:z-4">
      <LeftNav className="flex flex-col gap-4 items-center p-1">
        <Toggle className="rounded-sm" onClick={() => setShowFileTree(!showFileTree) } color="blue" toggleState={showFileTree}><FontAwesomeIcon icon={faFile} /></Toggle>
        <Toggle className="rounded-sm" onClick={() => setShowURLs(!showURLs) } color="purple" toggleState={showURLs}><FontAwesomeIcon icon={faLink} /></Toggle>
      </LeftNav>
      <div className="relative">
        <div className="h-full p-4 gap-4 absolute flex flex-col">
          <ContextContainer className={`min-w-48 ${showFileTree ? 'relative' : 'hidden'} rounded-md`} color="blue">
            <div className="w-full h-8 flex flex-row justify-between items-center relative overflow-hidden">
              <Band className="bg-custom-blue-1"/>
              <button onClick={handleFileSelect} className="top-1 right-2"><FontAwesomeIcon icon={faPlus} className="text-stone-500"/></button>
            </div>
            <div className="p-5 pt-1">
              <DragAndDrop onAddDir={handleAddDir} >
                {dirsPaths.map(dp => (
                  <div key={dp} className="me-5">
                    <AddDirectory path={dp} setDirs={setProjectDirs} onSwitchActiveFile={handleSwitchActiveFile} onCreateFile={handleOnFileCreate} onDeleteFile={handleOnFileDelete} handleRemoveDir={() => handleRemoveDir(dp)} />
                  </div>
                ))}
              </DragAndDrop>
            </div>
          </ContextContainer>

          {showURLs && <ContextContainer className="min-w-48 rounded-md" color="purple">
            <div className="w-full h-8 flex flex-row justify-between items-center relative overflow-hidden">
              <Band className="bg-custom-purple-1"/>
            </div>
            <div className="p-5 pt-1">
              <p>URLs will be shown here.</p>
            </div>
          </ContextContainer>}
        </div>
      </div>
    </div>
    {activeFileManager.getFile() && showActiveFile && 
    <ContextContainer className="min-w-[648px] mx-auto my-6 z-1 overflow-hidden focus-within:z-4 p-2" color="purple">
      <div className="flex flex-row justify-between mb-4">
        <div>File: {activeFileManager.getFile() ? activeFileManager.getFile()?.path : 'Select File / Loading...'}</div>
        <div className="flex flex-row gap-2">
          { getContentTypeFromPath(activeFileManager.getFile()?.path || '') === "html" && <button onClick={handleHTMLExport}><FontAwesomeIcon icon={faFileExport} /></button>}
          <button onClick={() => setShowActiveFile(false)}><FontAwesomeIcon icon={faX} /></button>
        </div>
      </div>
      <div className="w-full  h-full z-0 flex flex-col"> 
        <div className="flex h-[90vh] overflow-auto">
          { getContentTypeFromPath(activeFileManager.getFile()?.path || "") === 'markdown' ? 
            <DisplayEditor editor={markdownEditor} editorType={'markdown'} /> :  
            <DisplayCKEditor editorHandle={htmlEditor} defaultContent={activeFileManager.getFile()?.content || ""}/> 
          }
        </div>
      </div>
    </ContextContainer>}
    <ChatArea className="absolute right-0 h-full z-3 focus-within:z-4">
      <ChatWindow loadDir={virtualDir.pullFileSystem} project="test" folders={dirsPaths} onRequest={handleOnChatRequest}/>
    </ChatArea>
  </div>
  )
}

export default App

function AddDirectory({path, setDirs, onSwitchActiveFile, onDeleteFile, onCreateFile, handleRemoveDir}: {path: string, setDirs: Dispatch<SetStateAction<ManagedFileSystem[]>>, onSwitchActiveFile: (path: string) => void, onDeleteFile: (path: string) => void, onCreateFile: (path: string) => void, handleRemoveDir: (path: string) => void} ) {
  const dir = useManageFiles(path);
  const logger = useLogger();

  useEffect(() => {
    console.log("Adding directory: ", dir.dir.title);
    let exists = false;
    setDirs(prev => {
      const index = prev.findIndex(d => d.dir.title === dir.dir.title);
      if ( index !== -1 ) exists = true;
      if ( index !== -1 ) prev.splice(index, 1); // replace if exists
      return [...prev, dir];
    });
    if ( !exists ) logger.addedDirLog(path);
  }, [dir.dir])

  useEffect(() => {
    return () => {
      logger.removedDirLog(path);
      setDirs(prev => prev.filter(d => d.dir.title !== dir.dir.title) );
    }
  }, [])

  return <FileTree dir={dir.dir} onFileChange={(path) => onSwitchActiveFile(path)} onFileCreate={(path) => onCreateFile(path)} onFileDelete={(path) => onDeleteFile(path)} onRemoveDir={() => handleRemoveDir(path)} />; 
}

function DragAndDrop(props: {children: React.ReactNode, onAddDir: (path: string) => void}) {

  const onDragOver = (e) => {
    let event = e as Event;
    event.stopPropagation();
    event.preventDefault();
  }

  const onDragEnter = (e) => {
    let event = e as Event;
    event.stopPropagation();
    event.preventDefault();
  }

  const onFileDrop = async (e) => {
    let event = e as Event;
    event.stopPropagation();
    event.preventDefault();

    const paths: string[] = [];

    const items = e.dataTransfer?.items;
    for ( let i = 0; i< items.length; i++ ) {
      const file: File = items[i].getAsFile();
      if ( file ) {
        const path = window.dragAndDrop.dragAndDropFile(file);
        paths.push(path);
      }
      
    }

    for ( const path of paths ) {
      props.onAddDir(path);
    }
  }

  return (
    <div 
      className="w-full flex flex-col relative min-w-32"
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDrop={onFileDrop}
    >
      {Children.count(props.children) === 0 ? <FontAwesomeIcon icon={faFolderPlus} className="text-custom-gray-1 text-6xl m-auto"/> : props.children}
    </div>
  )
}
