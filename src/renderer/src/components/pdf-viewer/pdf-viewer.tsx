import { useCallback, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Configure worker
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker

interface PdfViewerProps {
  content: string // base64 string
}

const PdfViewer: React.FC<PdfViewerProps> = ({ content }) => {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setPageNumber(1)
  }

  const changePage = (offset: number) => {
    setPageNumber((prevPageNumber) => prevPageNumber + offset)
  }

  const previousPage = () => changePage(-1)
  const nextPage = () => changePage(1)

  const isPaginated = numPages > 10

  return (
    <div className="w-full h-full flex flex-col bg-gray-100 overflow-hidden text-black">
      {/* Controls */}
      <div className="flex items-center justify-between p-2 bg-white border-b shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-2">
          {isPaginated && (
            <>
              <button
                disabled={pageNumber <= 1}
                onClick={previousPage}
                className="px-3 py-1 text-sm bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
              >
                Previous
              </button>
              <span className="text-sm">
                Page {pageNumber} of {numPages || '--'}
              </span>
              <button
                disabled={pageNumber >= numPages}
                onClick={nextPage}
                className="px-3 py-1 text-sm bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
              >
                Next
              </button>
            </>
          )}
          {!isPaginated && (
            <span className="text-sm">
              {numPages || '--'} Pages
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="px-2 py-1 text-sm bg-gray-200 rounded">-</button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="px-2 py-1 text-sm bg-gray-200 rounded">+</button>
        </div>
      </div>

      {/* PDF Document */}
      <div className="flex-1 overflow-auto flex justify-center p-4">
        <Document
          file={`data:application/pdf;base64,${content}`}
          onLoadSuccess={onDocumentLoadSuccess}
          className="shadow-lg"
        >
          {isPaginated ? (
            <Page
              key={`page_${pageNumber}`}
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          ) : (
            Array.from(new Array(numPages), (el, index) => (
              <div key={`page_${index + 1}`} className="mb-4 last:mb-0">
                <Page
                  pageNumber={index + 1}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </div>
            ))
          )}
        </Document>
      </div>
    </div>
  )
}

export default PdfViewer
