"use client"

import { useState, useEffect } from "react"
import { Database, Trash2, RefreshCw, Eye, BarChart3 } from "lucide-react"
import { getAllIndexedRepositories, clearRepositoryCache } from "@/lib/database"

interface IndexedRepository {
  id: string
  repo_url: string
  repo_name: string
  repo_owner: string
  repo_description: string | null
  repo_stars: number
  repo_language: string | null
  repo_languages: string[]
  indexed_at: string
  last_accessed_at: string
  access_count: number
  index_status: 'pending' | 'indexing' | 'completed' | 'failed'
  index_progress: number
  total_files: number
  indexed_files: number
  is_popular: boolean
}

export default function AdminPage() {
  const [repositories, setRepositories] = useState<IndexedRepository[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    indexing: 0,
    failed: 0,
    popular: 0
  })

  useEffect(() => {
    loadRepositories()
  }, [])

  const loadRepositories = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/repositories')
      if (response.ok) {
        const data = await response.json()
        setRepositories(data)
        
        // Calculate stats
        const stats = {
          total: data.length,
          completed: data.filter((r: IndexedRepository) => r.index_status === 'completed').length,
          indexing: data.filter((r: IndexedRepository) => r.index_status === 'indexing').length,
          failed: data.filter((r: IndexedRepository) => r.index_status === 'failed').length,
          popular: data.filter((r: IndexedRepository) => r.is_popular).length
        }
        setStats(stats)
      }
    } catch (error) {
      console.error('Error loading repositories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClearCache = async (repoId: string) => {
    if (!confirm('Are you sure you want to clear this repository cache?')) return
    
    try {
      const response = await fetch('/api/admin/clear-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoId })
      })
      
      if (response.ok) {
        loadRepositories()
      }
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500 bg-green-500/10'
      case 'indexing': return 'text-blue-500 bg-blue-500/10'
      case 'failed': return 'text-red-500 bg-red-500/10'
      case 'pending': return 'text-yellow-500 bg-yellow-500/10'
      default: return 'text-gray-500 bg-gray-500/10'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-accent" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold console-text">CodeMentor Admin</h1>
            <p className="text-muted-foreground mt-2">Manage indexed repositories and cache</p>
          </div>
          <button
            onClick={loadRepositories}
            className="console-button flex items-center gap-2 px-4 py-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="console-border border rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-accent" />
              <span className="console-text font-medium">Total Repos</span>
            </div>
            <p className="text-2xl font-bold text-accent mt-2">{stats.total}</p>
          </div>
          
          <div className="console-border border rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="console-text font-medium">Completed</span>
            </div>
            <p className="text-2xl font-bold text-green-500 mt-2">{stats.completed}</p>
          </div>
          
          <div className="console-border border rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="console-text font-medium">Indexing</span>
            </div>
            <p className="text-2xl font-bold text-blue-500 mt-2">{stats.indexing}</p>
          </div>
          
          <div className="console-border border rounded-lg p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="console-text font-medium">Failed</span>
            </div>
            <p className="text-2xl font-bold text-red-500 mt-2">{stats.failed}</p>
          </div>
          
          <div className="console-border border rounded-lg p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-accent" />
              <span className="console-text font-medium">Popular</span>
            </div>
            <p className="text-2xl font-bold text-accent mt-2">{stats.popular}</p>
          </div>
        </div>

        {/* Repositories Table */}
        <div className="console-border border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="console-border border-b bg-card/30">
                <tr>
                  <th className="text-left p-4 console-text font-medium">Repository</th>
                  <th className="text-left p-4 console-text font-medium">Status</th>
                  <th className="text-left p-4 console-text font-medium">Files</th>
                  <th className="text-left p-4 console-text font-medium">Access</th>
                  <th className="text-left p-4 console-text font-medium">Indexed</th>
                  <th className="text-left p-4 console-text font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {repositories.map((repo) => (
                  <tr key={repo.id} className="console-border border-b hover:bg-card/20 transition-colors">
                    <td className="p-4">
                      <div>
                        <div className="console-text font-medium">{repo.repo_name}</div>
                        <div className="text-sm text-muted-foreground">{repo.repo_owner}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {repo.repo_stars} ⭐ • {repo.repo_language || 'Unknown'}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(repo.index_status)}`}>
                        {repo.index_status}
                      </span>
                      {repo.index_status === 'indexing' && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {repo.index_progress}%
                        </div>
                      )}
                    </td>
                    <td className="p-4 console-text">
                      {repo.indexed_files}/{repo.total_files}
                    </td>
                    <td className="p-4 console-text">
                      {repo.access_count}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {formatDate(repo.indexed_at)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <a
                          href={repo.repo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-accent/20 rounded transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleClearCache(repo.id)}
                          className="p-1 hover:bg-red-500/20 rounded transition-colors text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {repositories.length === 0 && (
          <div className="text-center py-12">
            <Database className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="console-text text-muted-foreground">No repositories indexed yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
