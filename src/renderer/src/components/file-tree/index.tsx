import { 
  faFile, 
  faFileExport,
  faTrash
} from '@fortawesome/free-solid-svg-icons';
import { File, PathTree } from 'src/types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react';

interface FileTreeProps {
  pathTree: PathTree;
  path?: string;
  onFileChange: (path: string) => void;
  onFileExport?: (path: string) => void;
  onFileDelete?: (path: string) => void;
  onFileSetAsContext?: (path: string) => void;
  onRemoveDir: () => void;
  onFileCreate: (path: string, content: string) => void;
}

export default function FileTree({ 
  pathTree,
  onFileChange,
  onFileExport, 
  onFileDelete, 
  onFileSetAsContext,
  onRemoveDir,
  onFileCreate,
}: FileTreeProps) {
  const [showFileForm, setShowFileForm] = useState(false);

  async function handleCreateFile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowFileForm(false);

    const formData = new FormData(event.currentTarget);

    const path = formData.get('path') as string;
    const title = formData.get('title') as string;

    event.currentTarget.reset();

    let newFile: File | undefined;

    newFile = newFile ? newFile : {path: `${path}/${title}`, content: 'Add new content here!'}
    onFileCreate(newFile.path, newFile.content);
  }

  return (
    <>
      <RecurseFileTree
        pathTree={pathTree}
        path={pathTree.title}
        onFileChange={onFileChange}
        onFileExport={onFileExport}
        onFileDelete={onFileDelete}
        onFileSetAsContext={onFileSetAsContext}
        onRemoveDir={onRemoveDir}
        handleCreateFile={handleCreateFile}
      />
    </>
    
  )
}

function RecurseFileTree({
  pathTree,
  path,
  onFileChange,
  onFileExport, 
  onFileDelete, 
  onFileSetAsContext,
  onRemoveDir,
  handleCreateFile,
}: {
  pathTree: PathTree;
  path?: string;
  onFileChange: (path: string) => void;
  onFileExport?: (path: string) => void;
  onFileDelete?: (path: string) => void;
  onFileSetAsContext?: (path: string) => void;
  onRemoveDir?: () => void;
  handleCreateFile: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {

  return (
    <div className="flex flex-col gap-1">
      <FolderComponent pathTree={pathTree} path={path || ''} handleCreateFile={handleCreateFile} onFileDelete={onFileDelete} onRemoveDir={onRemoveDir}/>
      {pathTree.children && pathTree.children.map((item, key) => 
            {
              const currentPath = path ? path + '/' + item.title : item.title;
            return (
            <div key={key} className="ml-4" attr-data={currentPath}>
              {item.pathType === 'file' && <FileComponent item={item} currentPath={currentPath} onFileChange={onFileChange} onFileExport={onFileExport} onFileDelete={onFileDelete} onFileSetAsContext={onFileSetAsContext}/>}
              {item.pathType === 'dir' && (
                <RecurseFileTree
                  pathTree={item}
                  path={currentPath}
                  onFileChange={onFileChange}
                  onFileExport={onFileExport}
                  onFileDelete={onFileDelete}
                  onFileSetAsContext={onFileSetAsContext}
                  handleCreateFile={handleCreateFile}
                />
              )}
            </div>)}
        )}
    </div>
  )
}

function FileComponent({ item, currentPath, onFileChange, onFileExport, onFileDelete, onFileSetAsContext }: {
  item: PathTree;
  currentPath: string;
  onFileChange: (path: string) => void;
  onFileExport?: (path: string) => void;
  onFileDelete?: (path: string) => void;
  onFileSetAsContext?: (path: string) => void;
}) {
  const [showControlMenu, setShowControlMenu] = useState(false);

  function handleRightClick(e: React.MouseEvent, path: string) {
    e.preventDefault();
    setShowControlMenu(!showControlMenu);

    const handleClickOutside = () => {
      setShowControlMenu(false);
      document.removeEventListener('click', handleClickOutside);
    };

    document.addEventListener('click', handleClickOutside);
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-row gap-2 items-center" >
        <button className="hover:cursor-pointer" onClick={() => onFileChange(currentPath)} onContextMenu={(e) => handleRightClick(e, currentPath)} aria-label="change file shown">
          <FontAwesomeIcon icon={faFile} />
        </button>
        <span>{item.title}</span>
      </div>
      <div className="relative w-0 h-0">
        {showControlMenu && <div className="absolute"><FileRightClickMenu currentPath={currentPath} onFileExport={onFileExport} onFileDelete={onFileDelete}/></div>}
      </div>
    </div>
  )
}

function FolderComponent({pathTree, path, handleCreateFile, onFileDelete, onRemoveDir}: {pathTree: PathTree, path: string, handleCreateFile: (event: React.FormEvent<HTMLFormElement>) => Promise<void>, onFileDelete?: (path: string) => void, onRemoveDir?: () => void}) {
  const [showControlMenu, setShowControlMenu] = useState(false);
  const [showFileForm, setShowFileForm] = useState(false);

    function handleRightClick(e: React.MouseEvent, path: string) {
    e.preventDefault();
    setShowControlMenu(!showControlMenu);

    const handleClickOutside = () => {
      setShowControlMenu(false);
      document.removeEventListener('click', handleClickOutside);
    };

    document.addEventListener('click', handleClickOutside);
  }

  return (
    <div className="font-semibold w-full flex justify-between" onContextMenu={(e) => handleRightClick(e, path)} >
      {pathTree.title}
      <div className="w-0 h-0">
        {showControlMenu && <div className="absolute"><FolderRightClickMenu currentPath={path} onFileDelete={onFileDelete} onFileCreate={() => setShowFileForm(!showFileForm) } onRemoveDir={onRemoveDir} /></div>}
      </div>
      <form onSubmit={(e) => {
        setShowFileForm(false); 
        handleCreateFile(e)}
        } className={`flex flex-col gap-2 absolute top-0 right-0 p-2 z-1 bg-black rounded-sm border-neutral-500/50 border-1 ${showFileForm ? '' : 'hidden'}`}>
        <button type="button" className="hover:cursor-pointer absolute top-2 right-2" onClick={() => setShowFileForm(false)}>X</button>
        <input type="text" name="title" placeholder="File Path" required/>
        <input type="url" name="content" placeholder="File Content URL" />
        <input type="hidden" name="path" value={path} />
        <button type="submit" className="bg-white rounded-md px-2 py-1 hover:cursor-pointer text-black">Add Document</button>
      </form>
    </div>
  )
}

function FileRightClickMenu({ onFileExport, onFileDelete, currentPath }: {
  onFileExport?: (path: string) => void;
  onFileDelete?: (path: string) => void;
  currentPath: string;
}) {
  return (
    <div className="flex flex-col gap-2 p-2 bg-custom-gray-3 text-custom-gray-1 rounded-md border border-custom-gray-1">
      {onFileExport && <button onClick={() => onFileExport(currentPath)} className="flex flex-row gap-2">Export <FontAwesomeIcon icon={faFileExport} /></button>}
      {onFileDelete && <button onClick={() => onFileDelete(currentPath)} className="flex flex-row gap-2">Delete <FontAwesomeIcon icon={faTrash} /></button>}
    </div>
  )
}

function FolderRightClickMenu({ onFileDelete, onFileCreate, currentPath, onRemoveDir }: {
  onFileDelete?: (path: string) => void;
  onFileCreate?: (path: string) => void;
  onRemoveDir?: () => void;
  currentPath: string;
}) {
  return (
    <div className="flex flex-col gap-2 p-2 bg-custom-gray-3 text-custom-gray-1 rounded-md border border-custom-gray-1">
      {onFileDelete && <button onClick={() => onFileDelete(currentPath)} className="flex flex-row gap-2 text-nowrap">Delete <FontAwesomeIcon icon={faTrash} /></button>}
      {onFileCreate && <button onClick={() => onFileCreate(currentPath)} className="flex flex-row gap-2 text-nowrap">New File <FontAwesomeIcon icon={faFile} /></button>}
      {onRemoveDir && <button onClick={() => onRemoveDir()} className="flex flex-row gap-2 text-nowrap">Remove Directory <FontAwesomeIcon icon={faFile} /></button>}
    </div>
  )
}