"use client"

import { useState, useEffect } from "react"
import { Copy, Download, Lightbulb, AlertCircle } from "lucide-react"

interface CodeTabProps {
  filePath: string
  onExplain?: (filePath: string, code: string) => void
  repoUrl?: string
}

interface FileContentResponse {
  content: string
  size: number
  sha: string
  download_url: string
  html_url: string
}

export default function CodeTab({ filePath, onExplain, repoUrl }: CodeTabProps) {
  const [code, setCode] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [fileInfo, setFileInfo] = useState<FileContentResponse | null>(null)
  const [highlightedCode, setHighlightedCode] = useState<string>("")

  useEffect(() => {
    const loadCode = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        console.log('🚀 CodeTab: Loading file content for:', filePath)
        
        // Get repoUrl from sessionStorage or use a default
        const currentRepoUrl = repoUrl || sessionStorage.getItem('currentRepoUrl')
        
        if (!currentRepoUrl) {
          throw new Error('Repository URL not available')
        }

        const response = await fetch('/api/fetch-file-content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            repoUrl: currentRepoUrl,
            filePath: filePath
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch file content')
        }

        const data: FileContentResponse = await response.json()
        
        console.log('✅ CodeTab: File content loaded successfully:', {
          size: data.size,
          contentLength: data.content.length
        })
        
        setCode(data.content)
        setFileInfo(data)
        setIsLoading(false)
        
      } catch (err: any) {
        console.error('❌ CodeTab: Error loading file content:', err)
        setError(err.message)
        setIsLoading(false)
      }
    }

    loadCode()
  }, [filePath, repoUrl])

  // Simple syntax highlighting without Prism.js
  useEffect(() => {
    if (code && !isLoading) {
      const language = getLanguage(filePath)
      const highlighted = applySimpleHighlighting(code, language)
      setHighlightedCode(highlighted)
    }
  }, [code, filePath, isLoading])

  const applySimpleHighlighting = (code: string, language: string): string => {
    if (language === 'text') {
      return code
    }

    let highlighted = code

    // Basic syntax highlighting patterns
    switch (language) {
      case 'typescript':
      case 'tsx':
      case 'javascript':
      case 'jsx':
        highlighted = highlightJavaScript(code)
        break
      case 'json':
        highlighted = highlightJSON(code)
        break
      case 'markdown':
        highlighted = highlightMarkdown(code)
        break
      case 'css':
        highlighted = highlightCSS(code)
        break
      case 'html':
        highlighted = highlightHTML(code)
        break
      case 'python':
        highlighted = highlightPython(code)
        break
      default:
        highlighted = code
    }

    return highlighted
  }

  const highlightJavaScript = (code: string): string => {
    return code
      // Comments
      .replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>')
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>')
      // Strings
      .replace(/(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span class="string">$1$2$1</span>')
      // Keywords
      .replace(/\b(const|let|var|function|class|if|else|for|while|return|import|export|from|default|async|await|try|catch|finally|throw|new|this|super|extends|implements|interface|type|enum|namespace|module|declare|abstract|static|readonly|public|private|protected)\b/g, '<span class="keyword">$1</span>')
      // Numbers
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>')
      // Functions
      .replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, '<span class="function">$1</span>')
  }

  const highlightJSON = (code: string): string => {
    return code
      // Keys
      .replace(/"([^"]+)":/g, '<span class="json-key">"$1":</span>')
      // Strings
      .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
      // Numbers
      .replace(/: (\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
      // Booleans
      .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
      // Null
      .replace(/: null/g, ': <span class="json-null">null</span>')
  }

  const highlightMarkdown = (code: string): string => {
    return code
      // Headers
      .replace(/^(#{1,6})\s+(.+)$/gm, '<span class="md-header">$1 $2</span>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<span class="md-bold">**$1**</span>')
      // Italic
      .replace(/\*(.+?)\*/g, '<span class="md-italic">*$1*</span>')
      // Code blocks
      .replace(/```[\s\S]*?```/g, '<span class="md-code-block">$&</span>')
      // Inline code
      .replace(/`([^`]+)`/g, '<span class="md-inline-code">`$1`</span>')
  }

  const highlightCSS = (code: string): string => {
    return code
      // Selectors
      .replace(/([.#]?[a-zA-Z][a-zA-Z0-9_-]*)\s*{/g, '<span class="css-selector">$1</span> {')
      // Properties
      .replace(/([a-zA-Z-]+)\s*:/g, '<span class="css-property">$1</span>:')
      // Values
      .replace(/:\s*([^;]+);/g, ': <span class="css-value">$1</span>;')
  }

  const highlightHTML = (code: string): string => {
    return code
      // Tags
      .replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)/g, '<$1<span class="html-tag">$2</span>')
      // Attributes
      .replace(/\s([a-zA-Z-]+)=/g, ' <span class="html-attr">$1</span>=')
      // Attribute values
      .replace(/="([^"]*)"/g, '="<span class="html-value">$1</span>"')
  }

  const highlightPython = (code: string): string => {
    return code
      // Comments
      .replace(/(#.*$)/gm, '<span class="comment">$1</span>')
      // Strings
      .replace(/(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span class="string">$1$2$1</span>')
      // Keywords
      .replace(/\b(def|class|if|elif|else|for|while|try|except|finally|with|as|import|from|return|yield|lambda|and|or|not|in|is|True|False|None)\b/g, '<span class="keyword">$1</span>')
      // Numbers
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>')
      // Functions
      .replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, '<span class="function">$1</span>')
  }


  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExplain = () => {
    if (onExplain) {
      onExplain(filePath, code)
    }
  }

  const getLanguage = (path: string): string => {
    const ext = path.split(".").pop()?.toLowerCase() || ""
    const languageMap: { [key: string]: string } = {
      ts: "typescript",
      tsx: "tsx",
      js: "javascript",
      jsx: "jsx",
      json: "json",
      md: "markdown",
      css: "css",
      html: "html",
      py: "python",
      java: "java",
      go: "go",
      rs: "rust",
      sh: "bash",
      bash: "bash",
      yaml: "yaml",
      yml: "yaml",
      sql: "sql",
    }
    return languageMap[ext] || "text"
  }


  const handleDownload = () => {
    if (fileInfo?.download_url) {
      window.open(fileInfo.download_url, '_blank')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="console-text text-muted-foreground">{"> Loading file..."}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Error Header */}
        <div className="console-border border-b bg-card/50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="console-text text-xs text-muted-foreground">{filePath}</span>
            <span className="console-text text-xs text-red-500/60 bg-red-500/10 px-2 py-1 rounded">
              Error
            </span>
          </div>
        </div>

        {/* Error Content */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
            <div className="console-text text-red-500 mb-2">Failed to load file</div>
            <div className="console-text text-muted-foreground text-xs">{error}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Code Header */}
      <div className="console-border border-b bg-card/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="console-text text-xs text-muted-foreground">{filePath}</span>
          <span className="console-text text-xs text-accent/60 bg-accent/10 px-2 py-1 rounded">
            {getLanguage(filePath).charAt(0).toUpperCase() + getLanguage(filePath).slice(1)}
          </span>
          {fileInfo && (
            <span className="console-text text-xs text-muted-foreground">
              {formatFileSize(fileInfo.size)}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExplain}
            className="console-text text-accent hover:text-accent/80 transition-colors hover:bg-accent/10 p-2 rounded-md"
            title="Explain this file"
            disabled={!code}
          >
            <Lightbulb size={16} />
          </button>
          <button
            onClick={handleCopy}
            className="console-text text-accent hover:text-accent/80 transition-colors hover:bg-accent/10 p-2 rounded-md"
            title="Copy code"
            disabled={!code}
          >
            <Copy size={16} />
          </button>
          <button
            onClick={handleDownload}
            className="console-text text-accent hover:text-accent/80 transition-colors hover:bg-accent/10 p-2 rounded-md"
            title="Download file"
            disabled={!fileInfo?.download_url}
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Code Content */}
      <div className="flex-1 overflow-auto p-4">
        <pre className="console-text text-xs text-foreground whitespace-pre-wrap break-words leading-relaxed">
          <code 
            className={`language-${getLanguage(filePath)}`}
            dangerouslySetInnerHTML={{ 
              __html: highlightedCode || code
            }}
          />
        </pre>
      </div>
    </div>
  )
}
