import FileTree from './components/file-tree'
import { useState, useEffect, Dispatch, SetStateAction, useCallback, Children } from 'react'
import {
  useManageFiles,
  ManagedFileSystem,
  useManageActiveFile,
  useVirtualDirectory
} from './hooks/use-file-manager'
import { getContentTypeFromPath } from './lib/file'
import {
  DisplayEditor,
  useTipTapMarkdownEditor
} from './components/tiptap-editor/tiptap-templates/simple/simple-editor'
import useCKHtmlEditor from '@renderer/components/ck-editor/ck-editor'
import DisplayCKEditor from '@renderer/components/ck-editor/ck-editor-display'
import useLogger from '@renderer/hooks/use-logger'
import ChatWindow from '@renderer/components/chat'
import LeftNav from './components/left-nav'
import Toggle from './components/toggle'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFile, faPenToSquare } from '@fortawesome/free-regular-svg-icons'
import {
  faLink,
  faSearch,
  faX,
  faFolderPlus,
  faPlus,
  faFileExport
} from '@fortawesome/free-solid-svg-icons'
import ChatArea from './components/chat-area'
import { SearchEmbeddings } from './components/search'

function App(): React.JSX.Element {
  const [dirsPaths, setDirsPaths] = useState<string[]>([])
  const [projectDirs, setProjectDirs] = useState<ManagedFileSystem[]>([])
  const activeFileManager = useManageActiveFile(projectDirs)
  const virtualDir = useVirtualDirectory('Test Project', projectDirs)

  // 'explorer', 'search', 'links' or null
  const [activeSideBar, setActiveSideBar] = useState<'explorer' | 'search' | 'links' | null>(
    'explorer'
  )

  // Toggle function for sidebar views
  const toggleSideBar = (view: 'explorer' | 'search' | 'links') => {
    if (activeSideBar === view) {
      setActiveSideBar(null) // Close if already open
    } else {
      setActiveSideBar(view)
    }
  }

  useEffect(() => {
    const cleanup = window.api.mainRequestFileState(() => {
      const activeFile = activeFileManager.activeFile
      if (activeFile) {
        const content = extractFileContent()
        virtualDir.updateFile(activeFile.path, content)
        activeFileManager.resetActiveFileState()
      }
    })
    return cleanup
  }, [activeFileManager, virtualDir])

  const markdownEditor = useTipTapMarkdownEditor(() => activeFileManager.nextActiveFileState())
  const htmlEditor = useCKHtmlEditor(() => activeFileManager.nextActiveFileState())

  const extractFileContent = useCallback(() => {
    const activeFile = activeFileManager.activeFile
    if (!activeFile) return ''
    const contentType = getContentTypeFromPath(activeFile?.path)
    if (contentType === 'markdown') {
      return markdownEditor?.getMarkdown() || ''
    } else {
      return htmlEditor?.editorRef.current?.getData() || ''
    }
  }, [activeFileManager.activeFile, markdownEditor, htmlEditor])

  useEffect(() => {
    const contentType = getContentTypeFromPath(activeFileManager.activeFile?.path || '')
    activeFileManager.resetActiveFileState()

    if (contentType === 'markdown' && markdownEditor) {
      const markdownContent = activeFileManager?.activeFile?.content || ''
      markdownEditor?.commands.setContent(markdownContent, { contentType: 'markdown' })
    } else if (contentType === 'html' && htmlEditor?.editorRef.current) {
      const htmlContent = activeFileManager?.activeFile?.content || ''
      htmlEditor?.editorRef.current.setData(htmlContent)
    }
  }, [activeFileManager.activeFile, markdownEditor, htmlEditor])

  const handleSwitchActiveFile = useCallback(async (filePath: string) => {
    if (activeFileManager.isEdited()) {
      await virtualDir.updateFile(activeFileManager.activeFile?.path || '', extractFileContent())
      activeFileManager.resetActiveFileState()
    }
    const rsp = await virtualDir.getFile(filePath)
    const cleanPath = virtualDir.getRelativePathInMFS(filePath)
    activeFileManager.setFile(cleanPath, rsp.file?.content || '')
  }, [virtualDir, activeFileManager, extractFileContent, dirsPaths])

  const handleOnFileDelete = useCallback(
    (filePath: string) => {
      if (activeFileManager.activeFile?.path === filePath) {
        activeFileManager.unset()
      }
      virtualDir.deleteFile(filePath)
    },
    [extractFileContent, activeFileManager]
  )

  const handleOnFileCreate = useCallback(
    (filePath: string) => {
      virtualDir.addFile(filePath, 'New file content')
    },
    [extractFileContent, virtualDir.addFile]
  )

  const handleOnChatRequest = useCallback(async () => {
    if (activeFileManager.isEdited()) {
      await virtualDir.updateFile(activeFileManager.activeFile?.path || '', extractFileContent())
      activeFileManager.resetActiveFileState()
    }
  }, [extractFileContent, virtualDir.updateFile])

  const handleRemoveDir = (path: string) => {
    setDirsPaths(dirsPaths.filter((p) => p !== path))
  }

  const handleAddDir = (path: string) => {
    if (!dirsPaths.includes(path)) {
      setDirsPaths([...dirsPaths, path])
    }
  }

  const handleFileSelect = async () => {
    const folder = await window.electron.ipcRenderer.invoke('select-folder', 'some data')
    if (folder && folder.filePaths && folder.filePaths.length > 0) {
      handleAddDir(folder.filePaths[0])
    }
  }

  const handleHTMLExport = async () => {
    if (activeFileManager.isEdited()) {
      virtualDir.updateFile(activeFileManager.activeFile?.path || '', extractFileContent())
      activeFileManager.resetActiveFileState()
    }
    const formData = {
      filePath: activeFileManager.activeFile?.path || '',
      content: extractFileContent()
    }
    await window.electron.ipcRenderer.invoke('export-html-to-pdf', formData)
  }

  const handleOnChatResponse = useCallback(async () => {
    if (activeFileManager.activeFile) {
      const updatedActiveFile = await virtualDir.getFile(activeFileManager.activeFile?.path || '')
      activeFileManager.setFile(
        activeFileManager.activeFile?.path || '',
        updatedActiveFile.file?.content || ''
      )
    }
    activeFileManager.resetActiveFileState()
    virtualDir.pullFileSystem()
  }, [extractFileContent, virtualDir.updateFile])

  return (
    <div className="w-screen h-screen flex flex-row overflow-hidden bg-ide-base text-ide-text-primary">
      {/* Activity Bar */}
      <LeftNav className="w-12 flex-none flex flex-col gap-4 items-center py-4 z-20">
        <Toggle
          onClick={() => toggleSideBar('explorer')}
          toggleState={activeSideBar === 'explorer'}
        >
          <FontAwesomeIcon icon={faFile} />
        </Toggle>
        <Toggle
          onClick={() => toggleSideBar('links')}
          toggleState={activeSideBar === 'links'}
        >
          <FontAwesomeIcon icon={faLink} />
        </Toggle>
        <Toggle
          onClick={() => toggleSideBar('search')}
          toggleState={activeSideBar === 'search'}
        >
          <FontAwesomeIcon icon={faSearch} />
        </Toggle>
      </LeftNav>

      {/* Sidebar Panel */}
      {activeSideBar && (
        <div className="w-64 flex-none border-r border-ide-border bg-ide-surface flex flex-col z-10">
          <div className="h-8 flex items-center px-4 border-b border-ide-border text-xs font-semibold tracking-wider text-ide-text-muted uppercase">
            {activeSideBar === 'explorer'
              ? 'Explorer'
              : activeSideBar === 'search'
                ? 'Search'
                : 'Links'}
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
            {activeSideBar === 'explorer' && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center px-2 mb-2">
                  <span className="text-xs font-bold text-ide-text-secondary">FOLDERS</span>
                  <button
                    onClick={handleFileSelect}
                    className="text-ide-text-muted hover:text-ide-text-primary"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                  </button>
                </div>
                <DragAndDrop onAddDir={handleAddDir}>
                  {dirsPaths.map((dp) => (
                    <div key={dp} className="mb-2">
                      <AddDirectory
                        path={dp}
                        setDirs={setProjectDirs}
                        onSwitchActiveFile={handleSwitchActiveFile}
                        onCreateFile={handleOnFileCreate}
                        onDeleteFile={handleOnFileDelete}
                        handleRemoveDir={() => handleRemoveDir(dp)}
                      />
                    </div>
                  ))}
                </DragAndDrop>
              </div>
            )}
            {activeSideBar === 'search' && (
              <SearchEmbeddings dirs={dirsPaths} onFileSelect={handleSwitchActiveFile} virtualDir={virtualDir} />
            )}
            {activeSideBar === 'links' && (
              <div className="p-4 text-sm text-ide-text-muted">Links will be shown here.</div>
            )}
          </div>
        </div>
      )}

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-ide-base relative">
        {activeFileManager.activeFile ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tab/Header */}
            <div className="h-9 flex items-center justify-between px-4 border-b border-ide-border bg-ide-surface-2 select-none">
              <div className="flex items-center gap-2 text-sm text-ide-text-primary">
                <FontAwesomeIcon icon={faFile} className="text-ide-accent text-xs" />
                <span className="truncate max-w-md">{activeFileManager.activeFile.path}</span>
              </div>
              <div className="flex gap-2">
                {getContentTypeFromPath(activeFileManager.activeFile.path) === 'html' && (
                  <button
                    onClick={handleHTMLExport}
                    title="Export to PDF"
                    className="text-ide-text-muted hover:text-ide-accent"
                  >
                    <FontAwesomeIcon icon={faFileExport} />
                  </button>
                )}
                <button
                  onClick={() => activeFileManager.unset()}
                  title="Close"
                  className="text-ide-text-muted hover:text-red-400"
                >
                  <FontAwesomeIcon icon={faX} size="sm" />
                </button>
              </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-auto bg-ide-base flex flex-col">
              {getContentTypeFromPath(activeFileManager.activeFile.path) === 'markdown' ? (
                <DisplayEditor editor={markdownEditor} editorType={'markdown'} />
              ) : (
                <DisplayCKEditor
                  editorHandle={htmlEditor}
                  defaultContent={activeFileManager.activeFile.content || ''}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-ide-text-muted opacity-50 select-none">
            <FontAwesomeIcon icon={faPenToSquare} className="text-6xl mb-4" />
            <p className="text-lg font-medium">No file is open</p>
            <p className="text-sm">Select a file from the explorer to start editing</p>
          </div>
        )}
      </div>

      {/* Chat Area - Fixed Width Right Sidebar */}
      <ChatArea className="w-80 flex-none border-l border-ide-border bg-ide-surface z-20 flex flex-col">
        <ChatWindow
          project="test"
          folders={dirsPaths}
          onRequest={handleOnChatRequest}
          onResponse={handleOnChatResponse}
        />
      </ChatArea>
    </div>
  )
}

export default App

interface AddDirectoryProps {
  path: string
  setDirs: Dispatch<SetStateAction<ManagedFileSystem[]>>
  onSwitchActiveFile: (path: string) => void
  onDeleteFile: (path: string) => void
  onCreateFile: (path: string) => void
  handleRemoveDir: (path: string) => void
}

function AddDirectory({
  path,
  setDirs,
  onSwitchActiveFile,
  onDeleteFile,
  onCreateFile,
  handleRemoveDir
}: AddDirectoryProps) {
  const dir = useManageFiles(path)
  const logger = useLogger()

  useEffect(() => {
    let exists = false
    setDirs((prev) => {
      const index = prev.findIndex((d) => d.dir.title === dir.dir.title)
      if (index !== -1) exists = true
      if (index !== -1) prev.splice(index, 1) // replace if exists
      return [...prev, dir]
    })
    if (!exists) logger.addedDirLog(path)
  }, [dir.dir])

  function parentPath(filePath: string): string {
    const parts = filePath.split('/')
    return parts.slice(0, -1).join('/')
  }

  return (
    <FileTree
      rootPath={parentPath(path)}
      pathTree={dir.dir}
      onFileChange={(path) => onSwitchActiveFile(path)}
      onFileCreate={(path) => onCreateFile(path)}
      onFileDelete={(path) => onDeleteFile(path)}
      onRemoveDir={() => handleRemoveDir(path)}
      onEmbedFileTree={dir.embedFileTree}
    />
  )
}

function DragAndDrop(props: { children: React.ReactNode; onAddDir: (path: string) => void }) {
  const onDragOver = (e) => {
    let event = e as Event
    event.stopPropagation()
    event.preventDefault()
  }

  const onDragEnter = (e) => {
    let event = e as Event
    event.stopPropagation()
    event.preventDefault()
  }

  const onFileDrop = async (e) => {
    let event = e as Event
    event.stopPropagation()
    event.preventDefault()

    const paths: string[] = []

    const items = e.dataTransfer?.items
    for (let i = 0; i < items.length; i++) {
      const file: File = items[i].getAsFile()
      if (file) {
        const path = window.dragAndDrop.dragAndDropFile(file)
        paths.push(path)
      }
    }

    for (const path of paths) {
      props.onAddDir(path)
    }
  }

  return (
    <div
      className="w-full flex flex-col relative min-w-32"
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDrop={onFileDrop}
    >
      {Children.count(props.children) === 0 ? (
        <FontAwesomeIcon icon={faFolderPlus} className="text-custom-gray-1 text-6xl m-auto" />
      ) : (
        props.children
      )}
    </div>
  )
}
