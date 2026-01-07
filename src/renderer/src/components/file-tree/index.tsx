import { 
  faFile, 
  faFileExport,
  faTrash
} from '@fortawesome/free-solid-svg-icons';
import { File, PathTree } from 'src/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState, useEffect } from 'react';

interface FileTreeProps {
  pathTree: PathTree;
  rootPath: string;
  onFileChange: (path: string) => void;
  onFileExport?: (path: string) => void;
  onFileDelete?: (path: string) => void;
  onFileSetAsContext?: (path: string) => void;
  onRemoveDir?: () => void;
  onFileCreate: (path: string, content: string) => void;
  onEmbedFileTree?: () => Promise<void>;
}

export default function FileTree({
  rootPath,
  pathTree,
  onFileChange,
  onFileExport, 
  onFileDelete, 
  onFileSetAsContext,
  onRemoveDir,
  onFileCreate,
  onEmbedFileTree
}: FileTreeProps) {
  
  const handleCreateFile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const path = formData.get('path') as string;
    const title = formData.get('title') as string;
    
    event.currentTarget.reset();
    
    onFileCreate(`${path}/${title}`, 'Add new content here!');
  };

  return (
    <RecurseFileTree
      pathTree={pathTree}
      path={pathTree.title}
      rootPath={rootPath}
      onFileChange={onFileChange}
      onFileExport={onFileExport}
      onFileDelete={onFileDelete}
      onFileSetAsContext={onFileSetAsContext}
      onRemoveDir={onRemoveDir}
      handleCreateFile={handleCreateFile}
      onEmbedFileTree={onEmbedFileTree}
    />
  );
}

const RecurseFileTree = ({
  pathTree,
  path,
  rootPath,
  onFileChange,
  onFileExport, 
  onFileDelete, 
  onFileSetAsContext,
  onRemoveDir,
  handleCreateFile,
  onEmbedFileTree
}: {
  pathTree: PathTree;
  path?: string;
  rootPath: string;
  onFileChange: (path: string) => void;
  onFileExport?: (path: string) => void;
  onFileDelete?: (path: string) => void;
  onFileSetAsContext?: (path: string) => void;
  onRemoveDir?: () => void;
  handleCreateFile: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onEmbedFileTree?: () => Promise<void>;
}) => {
  return (
    <div className="flex flex-col gap-1">
      <FolderComponent 
        pathTree={pathTree} 
        path={path || ''} 
        handleCreateFile={handleCreateFile} 
        onFileDelete={onFileDelete} 
        onRemoveDir={onRemoveDir} 
        onEmbedFileTree={onEmbedFileTree} 
      />
      {pathTree.children?.map((item) => {
        const currentPath = path ? `${path}/${item.title}` : item.title;
        return (
          <div key={item.title} className="ml-4">
            {item.pathType === 'file' ? (
              <FileComponent 
                item={item} 
                currentPath={currentPath} 
                rootPath={rootPath} 
                onFileChange={onFileChange} 
                onFileExport={onFileExport} 
                onFileDelete={onFileDelete} 
                onFileSetAsContext={onFileSetAsContext}
              />
            ) : (
              <RecurseFileTree
                pathTree={item}
                path={currentPath}
                rootPath={rootPath}
                onFileChange={onFileChange}
                onFileExport={onFileExport}
                onFileDelete={onFileDelete}
                onFileSetAsContext={onFileSetAsContext}
                handleCreateFile={handleCreateFile}
                onRemoveDir={onRemoveDir}
                onEmbedFileTree={onEmbedFileTree}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

const FileComponent = ({ 
  item, 
  currentPath, 
  rootPath, 
  onFileChange, 
  onFileExport, 
  onFileDelete, 
  onFileSetAsContext 
}: {
  item: PathTree;
  currentPath: string;
  rootPath: string;
  onFileChange: (path: string) => void;
  onFileExport?: (path: string) => void;
  onFileDelete?: (path: string) => void;
  onFileSetAsContext?: (path: string) => void;
}) => {
  const [showControlMenu, setShowControlMenu] = useState(false);
  const [htmlTemplatePath, setHtmlPath] = useState<string | undefined>();

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowControlMenu(true);
  };

  // Improved cleanup with useEffect
  useEffect(() => {
    if (!showControlMenu) return;

    const handleClickOutside = () => {
      setShowControlMenu(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showControlMenu]);

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-row gap-2 items-center">
        <button 
          className="hover:cursor-pointer" 
          onClick={() => onFileChange(currentPath)} 
          onContextMenu={handleRightClick} 
          aria-label={`Open ${item.title}`}
        >
          <FontAwesomeIcon icon={faFile} />
        </button>
        <span>{item.title}</span>
      </div>
      {showControlMenu && (
        <div className="relative w-0 h-0">
          <div className="absolute">
            <FileRightClickMenu 
              currentPath={currentPath} 
              rootPath={rootPath} 
              onFileExport={onFileExport} 
              onFileDelete={onFileDelete} 
              htmlPath={htmlTemplatePath} 
              setHtmlPath={setHtmlPath}
              onFileSetAsContext={onFileSetAsContext}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const FolderComponent = ({
  pathTree, 
  path, 
  handleCreateFile, 
  onFileDelete, 
  onRemoveDir, 
  onEmbedFileTree
}: {
  pathTree: PathTree;
  path: string;
  handleCreateFile: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onFileDelete?: (path: string) => void;
  onRemoveDir?: () => void;
  onEmbedFileTree?: () => Promise<void>;
}) => {
  const [showControlMenu, setShowControlMenu] = useState(false);
  const [showFileForm, setShowFileForm] = useState(false);

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowControlMenu(true);
  };

  useEffect(() => {
    if (!showControlMenu) return;

    const handleClickOutside = () => {
      setShowControlMenu(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showControlMenu]);

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setShowFileForm(false); 
    await handleCreateFile(e);
  };

  return (
    <div className="font-semibold w-full flex justify-between" onContextMenu={handleRightClick}>
      {pathTree.title}
      {showControlMenu && (
        <div className="w-0 h-0">
          <div className="absolute">
            <FolderRightClickMenu 
              currentPath={path} 
              onFileDelete={onFileDelete} 
              onFileCreate={() => setShowFileForm(true)} 
              onRemoveDir={onRemoveDir} 
              onEmbedFileTree={onEmbedFileTree} 
            />
          </div>
        </div>
      )}
      {showFileForm && (
        <form 
          onSubmit={handleFormSubmit} 
          className="flex flex-col gap-2 absolute top-0 right-0 p-2 z-10 bg-black rounded-sm border border-neutral-500/50"
        >
          <button 
            type="button" 
            className="hover:cursor-pointer absolute top-2 right-2" 
            onClick={() => setShowFileForm(false)}
            aria-label="Close form"
          >
            ✕
          </button>
          <input type="text" name="title" placeholder="File Path" required />
          <input type="url" name="content" placeholder="File Content URL" />
          <input type="hidden" name="path" value={path} />
          <button 
            type="submit" 
            className="bg-white rounded-md px-2 py-1 hover:cursor-pointer text-black"
          >
            Add Document
          </button>
        </form>
      )}
    </div>
  );
};

const FileRightClickMenu = ({ 
  onFileExport, 
  onFileDelete, 
  onFileSetAsContext,
  currentPath, 
  rootPath, 
  htmlPath, 
  setHtmlPath 
}: {
  onFileExport?: (path: string) => void;
  onFileDelete?: (path: string) => void;
  onFileSetAsContext?: (path: string) => void;
  currentPath: string;
  rootPath: string;
  htmlPath?: string;
  setHtmlPath?: React.Dispatch<React.SetStateAction<string | undefined>>;
}) => {
  const onExport = async () => {
    if (!htmlPath) return;
    await window.electron.ipcRenderer.invoke('template-convert', `${rootPath}/${currentPath}`, htmlPath);
  };

  const handleFileSelect = async (e: React.MouseEvent) => {
    e.preventDefault();
    const folder = await window.electron.ipcRenderer.invoke("select-file");
    if (folder?.filePaths?.length > 0) {
      console.log("Selected template HTML path: ", folder.filePaths[0]);
      setHtmlPath?.(folder.filePaths[0]);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-2 bg-custom-gray-3 text-custom-gray-1 rounded-md border border-custom-gray-1">
      {onFileExport && (
        <button onClick={() => onFileExport(currentPath)} className="flex flex-row gap-2">
          Export <FontAwesomeIcon icon={faFileExport} />
        </button>
      )}
      {onFileDelete && (
        <button onClick={() => onFileDelete(currentPath)} className="flex flex-row gap-2">
          Delete <FontAwesomeIcon icon={faTrash} />
        </button>
      )}
      {onFileSetAsContext && (
        <button onClick={() => onFileSetAsContext(currentPath)} className="flex flex-row gap-2 text-nowrap">
          Set as Context
        </button>
      )}
      <div>
        <button onClick={handleFileSelect} className="text-nowrap">
          {htmlPath ? "Change Template" : "Select Template"}
        </button>
        {htmlPath && <button onClick={onExport}>Export</button>}
      </div>
    </div>
  );
};

const FolderRightClickMenu = ({ 
  onFileDelete, 
  onFileCreate, 
  currentPath, 
  onRemoveDir, 
  onEmbedFileTree 
}: {
  onFileDelete?: (path: string) => void;
  onFileCreate?: () => void;
  onRemoveDir?: () => void;
  onEmbedFileTree?: () => Promise<void>;
  currentPath: string;
}) => {
  return (
    <div className="flex flex-col gap-2 p-2 bg-custom-gray-3 text-custom-gray-1 rounded-md border border-custom-gray-1">
      {onFileDelete && (
        <button onClick={() => onFileDelete(currentPath)} className="flex flex-row gap-2 text-nowrap">
          Delete <FontAwesomeIcon icon={faTrash} />
        </button>
      )}
      {onFileCreate && (
        <button onClick={onFileCreate} className="flex flex-row gap-2 text-nowrap">
          New File <FontAwesomeIcon icon={faFile} />
        </button>
      )}
      {onRemoveDir && (
        <button onClick={onRemoveDir} className="flex flex-row gap-2 text-nowrap">
          Remove Directory <FontAwesomeIcon icon={faTrash} />
        </button>
      )}
      {onEmbedFileTree && (
        <button onClick={onEmbedFileTree} className="flex flex-row gap-2 text-nowrap">
          Embed File Tree <FontAwesomeIcon icon={faFileExport} />
        </button>
      )}
    </div>
  );
};
