import { useState, useRef, useEffect, useCallback, ReactNode } from 'react'

interface ResizablePanelProps {
  children: ReactNode
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  side?: 'left' | 'right'
  className?: string
}

export default function ResizablePanel({
  children,
  defaultWidth = 256,
  minWidth = 150,
  maxWidth = 600,
  side = 'left',
  className = ''
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth)
  const [isResizing, setIsResizing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const startResizing = useCallback(() => {
    setIsResizing(true)
  }, [])

  const stopResizing = useCallback(() => {
    setIsResizing(false)
  }, [])

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing && panelRef.current) {
        const panelRect = panelRef.current.getBoundingClientRect()
        let newWidth: number

        if (side === 'left') {
          newWidth = e.clientX - panelRect.left
        } else {
          newWidth = panelRect.right - e.clientX
        }

        if (newWidth >= minWidth && newWidth <= maxWidth) {
          setWidth(newWidth)
        }
      }
    },
    [isResizing, minWidth, maxWidth, side]
  )

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', resize)
      document.addEventListener('mouseup', stopResizing)
      // Prevent text selection while resizing
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', resize)
      document.removeEventListener('mouseup', stopResizing)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, resize, stopResizing])

  return (
    <div
      ref={panelRef}
      className={`relative flex-none ${className}`}
      style={{ width: `${width}px` }}
    >
      {children}

      {/* Resize handle */}
      <div
        onMouseDown={startResizing}
        className={`absolute top-0 ${side === 'left' ? 'right-0' : 'left-0'} w-1 h-full cursor-col-resize 
          hover:bg-ide-accent transition-colors z-30 group`}
      >
        {/* Wider hover area for easier grabbing */}
        <div className={`absolute top-0 ${side === 'left' ? 'right-0 -translate-x-1' : 'left-0 translate-x-1'} 
          w-3 h-full -translate-x-1`}
        />

        {/* Visual indicator on hover */}
        <div className={`absolute top-0 ${side === 'left' ? 'right-0' : 'left-0'} w-1 h-full 
          bg-ide-accent ${isResizing ? 'opacity-50' : 'opacity-0 group-hover:opacity-50'} transition-opacity`}
        />
      </div>
    </div>
  )
}