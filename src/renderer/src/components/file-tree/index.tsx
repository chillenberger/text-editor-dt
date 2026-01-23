import { faFile, faFileExport, faTrash } from '@fortawesome/free-solid-svg-icons'
import { PathTree } from 'src/types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState, useEffect } from 'react'

// Base callback types
type FileActionCallbacks = {
  onFileChange: (path: string) => void
  onFileExport?: (path: string) => void
  onFileDelete?: (path: string) => void
  onFileSetAsContext?: (path: string) => void
}

type FolderActionCallbacks = {
  onFileDelete?: (path: string) => void
  onRemoveDir?: () => void
  onEmbedFileTree?: () => Promise<void>
}

// Menu-related types
type MenuPosition = { x: number; y: number }

type SetMenuFn = (
  menuData: FileMenuProps | FolderMenuProps,
  menuPos: MenuPosition,
  menuType: 'file' | 'folder'
) => void

interface FileMenuProps extends Pick<
  FileActionCallbacks,
  'onFileExport' | 'onFileDelete' | 'onFileSetAsContext'
> {
  currentPath: string
  rootPath: string
  htmlPath?: string
  setHtmlPath: React.Dispatch<React.SetStateAction<string | undefined>>
}

interface FolderMenuProps extends FolderActionCallbacks {
  currentPath: string
  onFolderDelete?: (path: string) => void
  onFileCreate?: () => void
}


interface NewFileFormProps {
  path: string
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onClose: () => void
}

interface FileTreeProps extends FileActionCallbacks, FolderActionCallbacks {
  pathTree: PathTree
  rootPath: string
  onFileCreate: (path: string, content: string) => void
}

interface RecursiveFileTreeProps extends FileActionCallbacks, FolderActionCallbacks {
  pathTree: PathTree
  path?: string
  rootPath: string
  handleCreateFile: (event: React.FormEvent<HTMLFormElement>) => Promise<void>
  setMenu: SetMenuFn
}

interface FileComponentProps extends FileActionCallbacks {
  item: PathTree
  currentPath: string
  rootPath: string
  setMenu: SetMenuFn
}

interface FolderComponentProps extends FolderActionCallbacks {
  pathTree: PathTree
  path: string
  handleCreateFile: (event: React.FormEvent<HTMLFormElement>) => Promise<void>
  setMenu: SetMenuFn
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
  const [showMenu, setShowMenu] = useState(false)
  const [fileMenu, setFileMenu] = useState<FileMenuProps | null>(null)
  const [folderMenu, setFolderMenu] = useState<FolderMenuProps | null>(null)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const setMenu = (
    menuData: FileMenuProps | FolderMenuProps,
    menuPos: { x: number; y: number },
    menuType: 'file' | 'folder'
  ) => {
    setMenuPos(menuPos)
    if (menuType === 'file') {
      setFolderMenu(null)
      setFileMenu(menuData as FileMenuProps)
    } else {
      setFileMenu(null)
      setFolderMenu(menuData as FolderMenuProps)
    }
    setShowMenu(true)
  }

  useEffect(() => {
    if (!showMenu) return
    const handleClickOutside = () => {
      setShowMenu(false)
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showMenu])

  const handleCreateFile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const path = formData.get('path') as string
    const title = formData.get('title') as string

    event.currentTarget.reset()

    onFileCreate(`${path}/${title}`, 'Add new content here!')
  }

  return (
    <>
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
        setMenu={setMenu}
      />
      {showMenu && (
        <div
          className="fixed z-50"
          style={{ top: menuPos.y, left: menuPos.x, pointerEvents: 'none' }}
        >
          <div className="relative w-full h-full">
            <div className="absolute" style={{ pointerEvents: 'auto' }}>
              {fileMenu && (
                <FileRightClickMenu
                  currentPath={fileMenu.currentPath}
                  onFileExport={fileMenu.onFileExport}
                  onFileDelete={fileMenu.onFileDelete}
                  onFileSetAsContext={fileMenu.onFileSetAsContext}
                  rootPath={fileMenu.rootPath}
                  htmlPath={fileMenu.htmlPath}
                  setHtmlPath={fileMenu.setHtmlPath}
                />
              )}
              {folderMenu && (
                <FolderRightClickMenu
                  currentPath={folderMenu.currentPath}
                  onRemoveDir={folderMenu.onRemoveDir}
                  onFileCreate={folderMenu.onFileCreate}
                  onEmbedFileTree={folderMenu.onEmbedFileTree}
                  onFolderDelete={folderMenu.onFolderDelete}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
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
  onEmbedFileTree,
  setMenu
}: RecursiveFileTreeProps) => {
  return (
    <div className="flex flex-col gap-1">
      <FolderComponent
        pathTree={pathTree}
        path={path || ''}
        handleCreateFile={handleCreateFile}
        onFileDelete={onFileDelete}
        onRemoveDir={onRemoveDir}
        onEmbedFileTree={onEmbedFileTree}
        setMenu={setMenu}
      />
      {pathTree.children?.map((item) => {
        const currentPath = path ? `${path}/${item.title}` : item.title
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
                setMenu={setMenu}
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
                setMenu={setMenu}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

const FileComponent = ({
  item,
  currentPath,
  rootPath,
  onFileChange,
  onFileExport,
  onFileDelete,
  onFileSetAsContext,
  setMenu
}: FileComponentProps) => {
  const [htmlPath, setHtmlPath] = useState<string | undefined>(undefined)

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setMenu(
      {
        currentPath,
        rootPath,
        onFileExport,
        onFileDelete,
        onFileSetAsContext,
        htmlPath,
        setHtmlPath
      },
      { x: e.clientX, y: e.clientY },
      'file'
    )
  }

  return (
    <button
      className="hover:cursor-pointer truncate w-full flex items-center justify-start gap-1 hover:bg-ide-surface-3"
      onClick={() => onFileChange(currentPath)}
      onContextMenu={handleRightClick}
      aria-label={`Open ${item.title}`}
    >
      <div className="w-5">
        <FontAwesomeIcon icon={faFile} />
      </div>
      <span className="truncate">{item.title}</span>
    </button>
  )
}

const FolderComponent = ({
  pathTree,
  path,
  handleCreateFile,
  onFileDelete,
  onRemoveDir,
  onEmbedFileTree,
  setMenu
}: FolderComponentProps) => {
  const [showFileForm, setShowFileForm] = useState(false)

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setShowFileForm(false)
    await handleCreateFile(e)
  }

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setMenu(
      {
        currentPath: path,
        onFileDelete: onFileDelete,
        onFileCreate: () => setShowFileForm(true),
        onRemoveDir: onRemoveDir,
        onEmbedFileTree: onEmbedFileTree
      },
      { x: e.clientX, y: e.clientY },
      'folder'
    )
  }

  return (
    <div className="font-semibold w-full flex justify-between hover:bg-ide-surface-3" onContextMenu={handleRightClick}>
      {pathTree.title}
      {showFileForm && (
        <NewFileForm
          path={path}
          onSubmit={handleFormSubmit}
          onClose={() => setShowFileForm(false)}
        />
      )}
    </div>
  )
}

const NewFileForm = ({
  path,
  onSubmit,
  onClose
}: NewFileFormProps) => {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 absolute top-0 right-0 p-2 z-10 bg-ide-surface-2 rounded-sm border border-neutral-500/50">
      <button
        type="button"
        className="hover:cursor-pointer absolute top-2 right-2"
        onClick={onClose}
        aria-label="Close form"
      >
        ✕
      </button>
      <input type="text" name="title" placeholder="File Name" required />
      <input type="hidden" name="path" value={path} />
      <button
        type="submit"
        className="bg-white rounded-md px-2 py-1 hover:cursor-pointer text-black"
      >
        Create
      </button>
    </form>
  )
}

const FileRightClickMenu = ({
  onFileExport,
  onFileDelete,
  onFileSetAsContext,
  currentPath,
  rootPath,
  htmlPath,
  setHtmlPath
}: FileMenuProps) => {
  const onExport = async () => {
    if (!htmlPath) return
    await window.electron.ipcRenderer.invoke(
      'convert-md-to-pdf',
      `${rootPath}/${currentPath}`,
      htmlPath
    )
  }

  const handleFileSelect = async (e: React.MouseEvent) => {
    e.preventDefault()
    const folder = await window.electron.ipcRenderer.invoke('select-file')
    if (folder?.filePaths?.length > 0) {
      console.log('Selected template HTML path: ', folder.filePaths[0])
      setHtmlPath(folder.filePaths[0])
    }
  }

  return (
    <div className="flex flex-col gap-2 p-2 bg-ide-surface-2 text-ide-text-primary rounded-sm border border-ide-border shadow-lg text-sm start-10 relative">
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
        <button
          onClick={() => onFileSetAsContext(currentPath)}
          className="flex flex-row gap-2 text-nowrap"
        >
          Set as Context
        </button>
      )}
      <div>
        <button onClick={handleFileSelect} className="text-nowrap">
          {htmlPath ? 'Change Template' : 'Select Template'}
        </button>
        {htmlPath && <button onClick={onExport}>Export</button>}
      </div>
    </div>
  )
}

const FolderRightClickMenu = ({
  onFolderDelete,
  onFileCreate,
  currentPath,
  onRemoveDir,
  onEmbedFileTree
}: FolderMenuProps) => {
  return (
    <div className="flex flex-col gap-2 p-2 bg-ide-surface-2 text-ide-text-primary rounded-sm border border-ide-border shadow-lg text-sm start-10 relative">
      {onFolderDelete && (
        <button
          onClick={() => onFolderDelete(currentPath)}
          className="flex flex-row gap-2 text-nowrap"
        >
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
  )
}
