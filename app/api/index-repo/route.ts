// Index a repository with progress tracking
import { fetchCompleteRepositoryData, parseGitHubUrl } from '@/lib/github'
import { 
  createRepository, 
  updateRepositoryStatus, 
  getIndexingProgress,
  IndexedRepository 
} from '@/lib/database'
import { 
  initializeElasticsearch, 
  indexRepository, 
  indexFile 
} from '@/lib/elasticsearch'
import { fetchRawFileContent, scoreFileImportance, githubConcurrencyLimit } from '@/lib/github'
import { updateRepositoryInsights } from '@/lib/database'
import { generateInsightsFromReadme, analyzeRepositoryStructure } from '@/lib/gemini'
import { searchFilesInRepository } from '@/lib/elasticsearch'
import { ApiError } from '@/lib/types'

export async function POST(request: Request) {
  console.log('🔍 API Route: index-repo called')
  
  try {
    const { repoUrl } = await request.json()
    
    if (!repoUrl) {
      return Response.json(
        { error: 'Repository URL is required' },
        { status: 400 }
      )
    }

    // Initialize Elasticsearch if needed
    await initializeElasticsearch()

    // Extract repo info from URL
    const urlParts = repoUrl.replace('https://github.com/', '').split('/')
    const repoOwner = urlParts[0]
    const repoName = urlParts[1]

    // Fetch basic repo info to get stars before indexing
    let initialStars = 0
    let initialDesc = null
    try {
      const quickInfo = await fetchCompleteRepositoryData(repoUrl)
      initialStars = quickInfo.stars || 0
      initialDesc = quickInfo.description || null
    } catch {}

    // Create repository record
    const repoData: Omit<IndexedRepository, 'id' | 'indexed_at' | 'last_accessed_at' | 'access_count'> = {
      repo_url: repoUrl,
      repo_name: repoName,
      repo_owner: repoOwner,
      repo_description: initialDesc,
      repo_stars: initialStars,
      repo_language: null,
      repo_languages: [],
      repo_default_branch: 'main',
      repo_updated_at: new Date().toISOString(),
      index_status: 'pending',
      index_progress: 0,
      total_files: 0,
      indexed_files: 0,
      error_message: null,
      cache_ttl_hours: 24,
      is_popular: initialStars > 1000
    }

    const repository = await createRepository(repoData)
    console.log(`✅ Created repository record: ${repository.id}`)

    // Start indexing process (non-blocking)
    indexRepositoryAsync(repository.id, repoUrl)

    return Response.json({
      success: true,
      repoId: repository.id,
      message: 'Indexing started',
      status: 'pending'
    })

  } catch (error: any) {
    console.error('❌ Error in index-repo API:', error)
    return Response.json(
      { error: 'Failed to start indexing process' },
      { status: 500 }
    )
  }
}

// Async function to handle the actual indexing
async function indexRepositoryAsync(repoId: string, repoUrl: string) {
  try {
    console.log(`🔄 Starting indexing for repository: ${repoId}`)
    
    // Step 1: Update status to indexing
    await updateRepositoryStatus(repoId, 'indexing', 5, 'Fetching repository data from GitHub...')
    console.log(`✅ Updated status: 5% - Fetching from GitHub`)
    
    // Add small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Step 2: Fetch repository data from GitHub
    const repoData = await fetchCompleteRepositoryData(repoUrl)
    console.log(`✅ Fetched repository data: ${repoData.name}`)

    // Step 3: Update progress
    await updateRepositoryStatus(repoId, 'indexing', 20, 'Analyzing repository structure...')
    console.log(`✅ Updated status: 20% - Analyzing structure`)
    
    // Add small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Step 4: Count total files
    const totalFiles = countFilesRecursively(repoData.files)
    console.log(`📊 Total files to index: ${totalFiles}`)

    // Step 5: Update total files count
    await updateRepositoryStatus(repoId, 'indexing', 30, `Found ${totalFiles} files to index...`, undefined, totalFiles, 0)
    console.log(`✅ Updated status: 30% - Found ${totalFiles} files`)

    // Index repository metadata to Elasticsearch
    const indexedRepo = {
      id: repoId,
      repo_url: repoUrl,
      repo_name: repoData.name,
      repo_owner: repoUrl.split('/')[3],
      repo_description: repoData.description,
      repo_stars: repoData.stars,
      repo_language: repoData.languages[0] || null,
      repo_languages: repoData.languages,
      repo_default_branch: 'main',
      repo_updated_at: new Date().toISOString(),
      index_status: 'indexing',
      is_popular: repoData.stars > 1000
    }

    // Step 6: Index repository metadata
    await indexRepository(indexedRepo)
    console.log(`✅ Indexed repository metadata`)
    
    await updateRepositoryStatus(repoId, 'indexing', 40, 'Building search index...')
    console.log(`✅ Updated status: 40% - Building search index`)
    
    // Add small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Step 7: Flatten files and fetch ALL file contents from GitHub (not just top N)
    const flatFiles: { path: string }[] = []
    flattenFiles(repoData.files, flatFiles)

    let indexedFilesCount = 0
    const parsed = parseGitHubUrl(repoUrl)
    const owner = parsed?.owner || repoUrl.split('/')[3]
    const repo = parsed?.repo || repoData.name

    // Fetch real content for ALL files during indexing
    await indexFilesRecursively(repoId, repoData.files, owner, repo, async (filePath, content, fileType, language) => {
      try {
        const fileData = {
          id: `${repoId}_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`,
          repo_id: repoId,
          file_path: filePath,
          file_content: content,
          file_size: content.length,
          file_language: language,
          file_type: fileType
        }

        await indexFile(fileData)
        indexedFilesCount++

        // Update progress every 2 files for smoother animation
        if (indexedFilesCount % 2 === 0 || indexedFilesCount === totalFiles) {
          const progress = Math.min(40 + Math.floor((indexedFilesCount / totalFiles) * 50), 90)
          await updateRepositoryStatus(
            repoId, 
            'indexing', 
            progress, 
            `Indexing files... ${indexedFilesCount}/${totalFiles}`,
            undefined,
            totalFiles,
            indexedFilesCount
          )
          console.log(`✅ Updated status: ${progress}% - Indexed ${indexedFilesCount}/${totalFiles} files`)
        }
      } catch (fileError) {
        console.error(`❌ Error indexing file ${filePath}:`, fileError)
        // Continue with other files even if one fails
      }
    })

    await updateRepositoryStatus(repoId, 'indexing', 85, 'Fetched file contents from GitHub')

    // Step 7.5: Generate insights (README-first approach)
    await updateRepositoryStatus(repoId, 'indexing', 92, 'Generating repository insights...')
    try {
      const fileList = flatFiles.map(f => ({ path: f.path, type: 'file' }))
      
      // Try to find README first
      const readmeFiles = flatFiles.filter(f => 
        /^readme(\.md|\.rst|\.txt)?$/i.test(f.path.split('/').pop() || '')
      )
      
      if (readmeFiles.length > 0) {
        console.log(`📖 Found README: ${readmeFiles[0].path}, using for fast insights generation`)
        try {
          // Fetch README content
          const readmeContent = await fetchRawFileContent(owner, repo, readmeFiles[0].path)
          if (readmeContent && readmeContent.content) {
            const insights = await generateInsightsFromReadme(repoData.name, readmeContent.content, fileList)
            await updateRepositoryInsights(repoId, { 
              repo_summary: insights.summary,
              quickstart: insights.quickstart,
              contribution_guide: insights.contributionGuide
            })
            console.log('✅ Generated insights from README')
          } else {
            throw new Error('Could not fetch README content')
          }
        } catch (readmeError) {
          console.warn('⚠️ README-based insights failed, falling back to AI analysis:', readmeError)
          // Fallback to AI analysis
          const structureSummary = await analyzeRepositoryStructure(repoData.name, fileList)
          await updateRepositoryInsights(repoId, { repo_summary: structureSummary || null })
        }
      } else {
        console.log('📝 No README found, using AI analysis for insights')
        // Fallback to AI analysis when no README
        const structureSummary = await analyzeRepositoryStructure(repoData.name, fileList)
        await updateRepositoryInsights(repoId, { repo_summary: structureSummary || null })
      }
    } catch (e) {
      console.warn('⚠️ Failed to generate insights:', e)
    }

    // Step 8: Verify indexing was successful before marking as completed
    if (indexedFilesCount === 0) {
      throw new Error('No files were successfully indexed')
    }

    // Best-effort smoke test: do not fail the job if ES is eventually consistent
    try {
      const testSearch = await searchFilesInRepository(repoId, 'test')
      console.log(`✅ Search test attempted: ${testSearch.length} results`)
    } catch (searchError) {
      console.warn('⚠️ Search smoke test failed (non-fatal):', (searchError as any)?.message || searchError)
    }

    // Only mark as completed if everything worked
    await updateRepositoryStatus(
      repoId, 
      'completed', 
      100, 
      'Repository ready!',
      undefined,
      totalFiles,
      indexedFilesCount
    )
    console.log(`✅ Indexing completed successfully: ${indexedFilesCount} files indexed`)

    console.log(`✅ Successfully indexed repository: ${repoId}`)

  } catch (error: any) {
    console.error(`❌ Error indexing repository ${repoId}:`, error)
    await updateRepositoryStatus(
      repoId, 
      'failed', 
      0, 
      'Indexing failed',
      error.message
    )
  }
}

// Helper function to count files recursively
function countFilesRecursively(files: any[]): number {
  let count = 0
  for (const file of files) {
    if (file.type === 'file') {
      count++
    } else if (file.children) {
      count += countFilesRecursively(file.children)
    }
  }
  return count
}

// Helper function to index files recursively - NOW FETCHES ALL FILES
async function indexFilesRecursively(
  repoId: string, 
  files: any[],
  owner: string,
  repo: string,
  indexCallback: (filePath: string, content: string, fileType: string, language: string) => Promise<void>
) {
  for (const file of files) {
    if (file.type === 'file') {
      try {
        const language = getLanguageFromPath(file.path)
        let content = ''
        
        // Fetch real content from GitHub for ALL files
        try {
          const fetched = await githubConcurrencyLimit(() => fetchRawFileContent(owner, repo, file.path))
          if (fetched && fetched.content) {
            content = fetched.content
          } else {
            // Fallback for files that can't be fetched (too large, binary, etc.)
            content = `// File: ${file.path}\n// Content unavailable (file may be too large or binary)`
          }
        } catch (fetchError) {
          console.log(`⚠️ Could not fetch ${file.path}:`, (fetchError as any)?.message)
          content = `// File: ${file.path}\n// Content unavailable`
        }
        
        await indexCallback(file.path, content, 'file', language)
      } catch (error) {
        console.error(`Error processing file ${file.path}:`, error)
      }
    } else if (file.children) {
      await indexFilesRecursively(repoId, file.children, owner, repo, indexCallback)
    }
  }
}

// Flatten files helper
function flattenFiles(files: any[], out: { path: string }[]) {
  for (const f of files) {
    if (f.type === 'file') out.push({ path: f.path })
    if (f.children) flattenFiles(f.children, out)
  }
}

// Helper function to determine language from file path
function getLanguageFromPath(filePath: string): string | null {
  const extension = filePath.split('.').pop()?.toLowerCase()
  const languageMap: { [key: string]: string } = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'txt': 'text'
  }
  return languageMap[extension || ''] || null
}
