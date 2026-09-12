export {}

declare global {
  interface Window {
    electronAPI: {
      selectFolder: () => Promise<string | null>
      selectFile: () => Promise<string | null>
      openProject: (folderPath: string) => Promise<{ success: boolean; config?: unknown; error?: string }>
      readDir: (dirPath: string) => Promise<Array<{ name: string; isDirectory: boolean; path: string }>>
      readFile: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>
      writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>
      mkdir: (dirPath: string) => Promise<{ success: boolean; error?: string }>
      uploadPaper: (
        sourcePath: string,
        targetDir: string,
        category: 'deep-read' | 'skim-read',
      ) => Promise<{ success: boolean; metadata?: { title: string }; error?: string }>
      getPapers: (papersDir: string) => Promise<unknown>
      loadThreads: (projectDir: string) => Promise<unknown[]>
      saveThread: (projectDir: string, thread: unknown) => Promise<{ success: boolean; error?: string }>
      onProjectOpened: (callback: (...args: unknown[]) => void) => void
    }
  }
}
