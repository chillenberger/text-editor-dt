import { describe, expect, test } from '@jest/globals'
import path from 'path'
import { handleToolCall, initializeFileSystemTools } from './index.js'

const testFolder = path.join(process.cwd(), 'test_folder')

describe('handleToolCall', () => {
  test('calls read_pdf_file', async () => {
    // Initialize file system tools with the test folder.
    // We expect this to succeed now that the test folder persists.
    try {
        await initializeFileSystemTools([testFolder])
    } catch (e) {
        console.warn("Initialization warning:", e);
    }

    const result = await handleToolCall({
      name: 'read_pdf_file',
      arguments: {
        path: `${testFolder}/pdf_test_page.pdf`,
      },
    })

    const content = result.content[0] as { text: string, type: string }
    
    // Verify success
    expect(result).toHaveProperty('content')
    expect(result.content[0]).toHaveProperty('text')
    // We don't know the exact content of the PDF, but it should be a string
    expect(content.text).toContain('Test Page')
    expect(content.text.length).toBeGreaterThan(0)
  })
})