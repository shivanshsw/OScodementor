// Smart repository fetching with caching
import { fetchCompleteRepositoryData } from '@/lib/github'
import { getRepositoryByUrl, updateRepositoryAccess } from '@/lib/database'
import { searchFilesInRepository } from '@/lib/elasticsearch'
import { ApiError } from '@/lib/types'

export async function POST(request: Request) {
  console.log('🔍 API Route: fetch-repo called')
  
  try {
    // Parse request body
    let repoUrl: string
    try {
      const body = await request.json()
      repoUrl = body.repoUrl
      console.log('📝 Request body parsed, repoUrl:', repoUrl)
    } catch (parseError) {
      console.error('❌ Failed to parse request JSON:', parseError)
      return Response.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Validate input
    if (!repoUrl || typeof repoUrl !== 'string') {
      console.log('❌ Invalid repoUrl:', repoUrl)
      return Response.json(
        { error: 'Repository URL is required' },
        { status: 400 }
      )
    }

    // Validate GitHub URL format
    if (!repoUrl.includes('github.com')) {
      console.log('❌ Invalid GitHub URL:', repoUrl)
      return Response.json(
        { error: 'Please provide a valid GitHub repository URL' },
        { status: 400 }
      )
    }

    // Check if GitHub token is configured
    if (!process.env.GITHUB_TOKEN) {
      console.error('❌ GITHUB_TOKEN environment variable is not set')
      return Response.json(
        { error: 'GitHub API token not configured' },
        { status: 500 }
      )
    }

    console.log('✅ All validations passed, checking cache...')

    // Check if repository is cached
    let cachedRepo = null
    try {
      cachedRepo = await getRepositoryByUrl(repoUrl)
    } catch (dbError) {
      console.error('❌ Database error:', dbError)
      // Continue without cache if database fails
    }
    
    if (cachedRepo) {
      // Check if cache is still valid
      const now = new Date()
      const lastIndexed = new Date(cachedRepo.indexed_at)
      const ttlHours = cachedRepo.cache_ttl_hours || 24
      const cacheExpiry = new Date(lastIndexed.getTime() + (ttlHours * 60 * 60 * 1000))
      
      const isCacheValid = now < cacheExpiry
      const isCompleted = cachedRepo.index_status === 'completed'
      
      if (isCacheValid && isCompleted) {
        console.log('✅ Repository found in cache, loading from cache...')
        
        // Update access count
        try {
          await updateRepositoryAccess(cachedRepo.id)
        } catch (accessError) {
          console.error('❌ Error updating access count:', accessError)
          // Continue even if access count update fails
        }
        
        // Get files from Elasticsearch
        try {
          const indexedFiles = await searchFilesInRepository(cachedRepo.id, '*')

          // Rebuild hierarchical tree from flat list
          const buildTree = (paths: Array<{ path: string; type: string; content?: string }>) => {
            const root: any[] = []
            const nodes = new Map<string, any>()

            const ensureNode = (fullPath: string, isFile: boolean, content?: string) => {
              if (nodes.has(fullPath)) return nodes.get(fullPath)
              const parts = fullPath.split('/')
              const name = parts[parts.length - 1]
              const node: any = { path: fullPath, type: isFile ? 'file' : 'folder' }
              if (!isFile) node.children = []
              if (isFile && content !== undefined) (node as any).content = content
              nodes.set(fullPath, node)
              if (parts.length === 1) root.push(node)
              return node
            }

            // Create nodes
            for (const item of paths) {
              const parts = item.path.split('/')
              let currentPath = ''
              for (let i = 0; i < parts.length; i++) {
                currentPath = i === 0 ? parts[i] : `${currentPath}/${parts[i]}`
                const isLast = i === parts.length - 1
                const isFile = isLast && item.type === 'file'
                ensureNode(currentPath, isFile, isFile ? (item as any).content : undefined)
              }
            }

            // Link parents
            for (const [fullPath, node] of nodes.entries()) {
              const parts = fullPath.split('/')
              if (parts.length > 1) {
                const parentPath = parts.slice(0, -1).join('/')
                const parent = nodes.get(parentPath)
                if (parent && parent.type === 'folder') {
                  parent.children.push(node)
                }
              }
            }

            // Sort: folders first, then files; lexicographical within
            const sortRec = (items: any[]) => {
              items.sort((a, b) => {
                if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
                return a.path.localeCompare(b.path)
              })
              items.forEach(i => { if (i.children) sortRec(i.children) })
            }
            sortRec(root)
            return root
          }

          const flat = indexedFiles.map(file => ({
            path: file.file_path,
            type: file.file_type,
            content: file.file_content
          }))
          const tree = buildTree(flat)

          // Generate a super short description (not the exact GitHub description)
          const generateShortDescription = (
            name: string,
            original: string | null,
            languages?: string[] | null,
            stars?: number | null
          ) => {
            const primary = Array.isArray(languages) && languages.length > 0 ? languages[0] : undefined
            if (primary) return `${name} — ${primary} project.`
            return `${name} — open-source project.`
          }

          const repoData = {
            name: cachedRepo.repo_name,
            description: generateShortDescription(cachedRepo.repo_name, cachedRepo.repo_description, cachedRepo.repo_languages, cachedRepo.repo_stars),
            stars: cachedRepo.repo_stars,
            languages: cachedRepo.repo_languages,
            files: tree,
            issues: [],
            cached: true,
            cacheAge: Math.floor((now.getTime() - lastIndexed.getTime()) / (1000 * 60 * 60))
          }

          console.log('✅ Repository data loaded from cache:', {
            name: repoData.name,
            stars: repoData.stars,
            filesCount: repoData.files.length,
            cacheAge: repoData.cacheAge + ' hours'
          })

          return Response.json(repoData)
        } catch (elasticError) {
          console.error('❌ Error loading from Elasticsearch, falling back to GitHub API:', elasticError)
          // Continue to GitHub API fallback
        }
      } else if (cachedRepo.index_status === 'indexing') {
        console.log('⏳ Repository is currently being indexed...')
        return Response.json({
          indexing: true,
          repoId: cachedRepo.id,
          message: 'Repository is currently being indexed. Please wait...'
        })
      } else {
        console.log('⏰ Cache expired, fetching fresh data...')
      }
    }

    console.log('🔄 Repository not in cache or cache expired, fetching from GitHub...')

    // Fetch repository data from GitHub API
    const repoData = await fetchCompleteRepositoryData(repoUrl)
    
    console.log('✅ Repository data fetched successfully:', {
      name: repoData.name,
      stars: repoData.stars,
      filesCount: repoData.files.length,
      issuesCount: repoData.issues.length
    })

    // Add a note that caching is not available
    // Generate a super short description (not the exact GitHub description)
    const generateShortDescription = (
      name: string,
      original: string | null,
      languages?: string[] | null,
      stars?: number | null
    ) => {
      const primary = Array.isArray(languages) && languages.length > 0 ? languages[0] : undefined
      if (primary) return `${name} — ${primary} project.`
      return `${name} — open-source project.`
    }

    const responseData = {
      ...repoData,
      description: generateShortDescription(repoData.name, repoData.description || null, repoData.languages, repoData.stars),
      cached: false,
      cacheNote: 'Caching not available - database or Elasticsearch not configured'
    }

    return Response.json(responseData)

  } catch (error: any) {
    console.error('❌ Error in fetch-repo API:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })

    // Handle specific API errors
    if (error instanceof ApiError) {
      console.log('🔍 Handling ApiError:', error.type, error.message)
      switch (error.type) {
        case 'NOT_FOUND':
          return Response.json(
            { error: 'No such public repository available' },
            { status: 404 }
          )
        case 'RATE_LIMITED':
          return Response.json(
            { error: 'GitHub API rate limit exceeded. Please try again later.' },
            { status: 429 }
          )
        case 'INVALID_URL':
          return Response.json(
            { error: 'Invalid GitHub repository URL' },
            { status: 400 }
          )
        case 'GITHUB_ERROR':
          return Response.json(
            { error: 'GitHub API error. Please try again later.' },
            { status: error.status || 500 }
          )
        default:
          return Response.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
          )
      }
    }

    // Handle unexpected errors
    console.log('🔍 Handling unexpected error')
    return Response.json(
      { 
        error: 'An unexpected error occurred while fetching repository data',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}
