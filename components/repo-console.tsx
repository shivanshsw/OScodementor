"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronLeft, Settings } from "lucide-react"
import ChatWindow from "./chat-window"
import FileExplorer from "./file-explorer"
import SettingsPopup from "./settings-popup"
import { fetchRepoData, queryAI } from "@/lib/api"

interface RepoConsoleProps {
  repoUrl: string
  onBack: () => void
}

interface RepoData {
  name: string
  description: string
  stars: number
  languages: string[]
  files: Array<{
    path: string
    type: "file" | "folder"
    children?: Array<{
      path: string
      type: "file" | "folder"
      children?: Array<{
        path: string
        type: "file" | "folder"
      }>
    }>
  }>
  issues: Array<{ title: string; url: string; labels: string[] }>
  cached?: boolean
  cacheAge?: number
  indexing?: boolean
  repoId?: string
}

interface ChatMessage {
  id: string
  type: "user" | "ai"
  content: string
  context?: string
}

export default function RepoConsole({ repoUrl, onBack }: RepoConsoleProps) {
  const [repoData, setRepoData] = useState<RepoData | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [skillLevel, setSkillLevel] = useState<"beginner" | "intermediate" | "expert">("beginner")

  // Load skill level from localStorage on mount
  useEffect(() => {
    const savedSkillLevel = localStorage.getItem('codementor-skill-level') as "beginner" | "intermediate" | "expert"
    if (savedSkillLevel && ['beginner', 'intermediate', 'expert'].includes(savedSkillLevel)) {
      setSkillLevel(savedSkillLevel)
    }
  }, [])

  // Save skill level to localStorage when changed
  const handleSkillLevelChange = (newLevel: "beginner" | "intermediate" | "expert") => {
    setSkillLevel(newLevel)
    localStorage.setItem('codementor-skill-level', newLevel)
  }
  const [leftPanelWidth, setLeftPanelWidth] = useState(60) // percentage
  const [isDragging, setIsDragging] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isIndexing, setIsIndexing] = useState(false)
  const [indexingRepoId, setIndexingRepoId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadRepo = async () => {
      // Store repoUrl in sessionStorage for file content fetching
      sessionStorage.setItem('currentRepoUrl', repoUrl)
      
      try {
        const data = await fetchRepoData(repoUrl)
        
        // Check if repository is being indexed
        if (data.indexing && data.repoId) {
          setIsIndexing(true)
          setIndexingRepoId(data.repoId)
        } else {
          setIsIndexing(false)
          setIndexingRepoId(null)
          
          // If not cached and not indexing, start indexing
          if (!data.cached && !data.indexing) {
            console.log('🔄 Starting indexing for new repository...')
            await startIndexing(repoUrl)
          }
        }
        
        setRepoData(data)
      } catch (error) {
        console.error('Error loading repository:', error)
        // Handle error state
      }
    }
    loadRepo()
  }, [repoUrl])

  // Function to start indexing
  const startIndexing = async (repoUrl: string) => {
    try {
      const response = await fetch('/api/index-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl })
      })
      
      if (response.ok) {
        const data = await response.json()
        setIsIndexing(true)
        setIndexingRepoId(data.repoId)
        console.log('✅ Indexing started:', data.repoId)
      }
    } catch (error) {
      console.error('❌ Failed to start indexing:', error)
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return

      const container = containerRef.current
      const containerRect = container.getBoundingClientRect()
      const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100

      // Constrain between 30% and 70%
      if (newLeftWidth >= 30 && newLeftWidth <= 70) {
        setLeftPanelWidth(newLeftWidth)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging])

  const handleExplainFile = async (filePath: string, code: string) => {
    const messageId = Date.now().toString()

    // Add user message
    setChatMessages((prev) => [
      ...prev,
      {
        id: messageId,
        type: "user",
        content: `Explain this file: ${filePath}`,
        context: filePath,
      },
    ])

    // Get AI response
    const response = await queryAI(
      `Please explain the following code from ${filePath}:\n\n${code}`,
      filePath,
      skillLevel,
      repoUrl,
      chatMessages.slice(-5)
    )

    // Add AI response
    setChatMessages((prev) => [
      ...prev,
      {
        id: `${messageId}-response`,
        type: "ai",
        content: response,
        context: filePath,
      },
    ])
  }

  // Update selected file and clear chat context when file is closed
  const handleFileContextChange = (newSelectedFile: string | null) => {
    setSelectedFile(newSelectedFile)
    
    // Clear file-specific context from chat when file is closed
    if (!newSelectedFile) {
      setChatMessages(prev => prev.map(msg => ({
        ...msg,
        context: msg.type === 'ai' ? undefined : msg.context
      })))
    }
  }

  if (!repoData) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="console-text console-glow text-lg">{"> Initializing repository..."}</div>
      </div>
    )
  }

  return (
    <div className="w-full h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="console-border border-b bg-gradient-to-r from-card/80 to-card/40 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={onBack}
            className="console-text text-accent hover:text-accent/80 transition-colors flex items-center gap-2 hover:bg-accent/10 px-3 py-2 rounded-md"
          >
            <ChevronLeft size={20} />
            {"Back"}
          </button>
          <div className="console-border-l pl-4 flex-1">
            <div className="console-glow font-mono font-bold text-lg">{`> ${repoData.name}`}</div>
            <p className="console-text text-muted-foreground text-xs mt-1">{repoData.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="console-text text-muted-foreground text-sm flex items-center gap-2">
            <span className="text-accent">★</span>
            <span className="font-mono">{repoData.stars.toLocaleString()}</span>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="console-text text-accent hover:text-accent/80 transition-colors hover:bg-accent/10 p-2 rounded-md"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Main Content with Resizable Panels */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden">
        {/* Left Panel - Chat */}
        <div
          style={{ width: `${leftPanelWidth}%` }}
          className="console-border border-r flex flex-col bg-card/20 transition-all duration-75"
        >
          <ChatWindow
            repoData={repoData}
            selectedFile={selectedFile}
            skillLevel={skillLevel}
            repoUrl={repoUrl}
            isIndexing={isIndexing}
            repoId={indexingRepoId}
            onIndexingComplete={async () => {
              try {
                const data = await fetchRepoData(repoUrl)
                setRepoData(data)
                setIsIndexing(false)
                setIndexingRepoId(null)
              } catch (e) {
                console.error('Failed to refresh repo after indexing:', e)
              }
            }}
            onClearFileContext={() => {
              setSelectedFile(null)
              setChatMessages(prev => prev.map(msg => ({
                ...msg,
                context: msg.type === 'ai' ? undefined : msg.context
              })))
            }}
          />
        </div>

        <div
          onMouseDown={() => setIsDragging(true)}
          className={`w-1 bg-accent/20 hover:bg-accent/60 cursor-col-resize transition-colors ${
            isDragging ? "bg-accent/80" : ""
          }`}
        />

        {/* Right Panel - File Explorer */}
        <div
          style={{ width: `${100 - leftPanelWidth}%` }}
          className="console-border border-l flex flex-col bg-card/10 transition-all duration-75"
        >
          <FileExplorer
            files={repoData.files}
            onFileSelect={handleFileContextChange}
            selectedFile={selectedFile}
            onExplainFile={handleExplainFile}
            repoUrl={repoUrl}
          />
        </div>
      </div>

        <SettingsPopup 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)}
          skillLevel={skillLevel}
          onSkillLevelChange={handleSkillLevelChange}
        />
    </div>
  )
}
