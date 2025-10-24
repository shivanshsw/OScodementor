// Elasticsearch integration for code indexing and search
import { Client } from '@elastic/elasticsearch'

// Elasticsearch client configuration with improved error handling
const client = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
    password: process.env.ELASTICSEARCH_PASSWORD || 'changeme',
  },
  tls: {
    rejectUnauthorized: false
  },
  requestTimeout: 30000, // 30 seconds
  pingTimeout: 3000, // 3 seconds
  maxRetries: 3,
  resurrectStrategy: 'ping'
})

// Index names
const REPOSITORY_INDEX = 'codementor_repositories'
const FILES_INDEX = 'codementor_files'

// Test Elasticsearch connection
export async function testElasticsearchConnection(): Promise<boolean> {
  try {
    console.log('🔍 Testing Elasticsearch connection...')
    const response = await client.ping()
    console.log('✅ Elasticsearch connection successful')
    return true
  } catch (error: any) {
    console.error('❌ Elasticsearch connection failed:', error.message)
    return false
  }
}

// Initialize Elasticsearch indices
export async function initializeElasticsearch() {
  try {
    console.log('🔍 Initializing Elasticsearch...')
    
    // Test connection first
    const isConnected = await testElasticsearchConnection()
    if (!isConnected) {
      throw new Error('Cannot connect to Elasticsearch. Please check your configuration.')
    }
    
    // Check if indices exist
    const repoIndexExists = await client.indices.exists({ index: REPOSITORY_INDEX })
    const filesIndexExists = await client.indices.exists({ index: FILES_INDEX })

    // Create repositories index
    if (!repoIndexExists) {
      await client.indices.create({
        index: REPOSITORY_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              repo_url: { type: 'keyword' },
              repo_name: { 
                type: 'text',
                analyzer: 'standard',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              repo_owner: { 
                type: 'text',
                analyzer: 'standard',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              repo_description: { 
                type: 'text',
                analyzer: 'standard'
              },
              repo_stars: { type: 'integer' },
              repo_language: { type: 'keyword' },
              repo_languages: { type: 'keyword' },
              repo_default_branch: { type: 'keyword' },
              repo_updated_at: { type: 'date' },
              indexed_at: { type: 'date' },
              last_accessed_at: { type: 'date' },
              access_count: { type: 'integer' },
              index_status: { type: 'keyword' },
              is_popular: { type: 'boolean' },
              created_at: { type: 'date' }
            }
          }
        }
      })
      console.log('✅ Created repositories index')
    }

    // Create files index
    if (!filesIndexExists) {
      await client.indices.create({
        index: FILES_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              repo_id: { type: 'keyword' },
              file_path: { 
                type: 'text',
                analyzer: 'keyword',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              file_content: { 
                type: 'text',
                analyzer: 'standard',
                search_analyzer: 'standard'
              },
              file_size: { type: 'integer' },
              file_language: { type: 'keyword' },
              file_type: { type: 'keyword' },
              indexed_at: { type: 'date' },
              created_at: { type: 'date' }
            }
          }
        }
      })
      console.log('✅ Created files index')
    }

    console.log('✅ Elasticsearch indices initialized successfully')
  } catch (error) {
    console.error('❌ Error initializing Elasticsearch:', error)
    throw error
  }
}

// Index a repository
export async function indexRepository(repoData: any): Promise<void> {
  try {
    await client.index({
      index: REPOSITORY_INDEX,
      id: repoData.id,
      body: {
        ...repoData,
        indexed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      }
    })
    console.log(`✅ Indexed repository: ${repoData.repo_name}`)
  } catch (error) {
    console.error('❌ Error indexing repository:', error)
    throw error
  }
}

// Index a file with retry logic
export async function indexFile(fileData: any): Promise<string> {
  const maxRetries = 3
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📄 Indexing file: ${fileData.file_path} (attempt ${attempt}/${maxRetries})`)
      
      const response = await client.index({
        index: FILES_INDEX,
        body: {
          ...fileData,
          indexed_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }
      })
      
      console.log(`✅ Indexed file: ${fileData.file_path}`)
      return response._id
    } catch (error: any) {
      lastError = error
      console.warn(`❌ Error indexing file ${fileData.file_path} (attempt ${attempt}/${maxRetries}):`, error.message)
      
      if (attempt === maxRetries) {
        console.error(`❌ Failed to index file ${fileData.file_path} after ${maxRetries} attempts`)
        throw error
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }
  
  throw lastError!
}

// Search repositories
export async function searchRepositories(query: string, filters: any = {}): Promise<any[]> {
  try {
    const searchBody: any = {
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: query,
                fields: ['repo_name^2', 'repo_description', 'repo_owner'],
                type: 'best_fields',
                fuzziness: 'AUTO'
              }
            }
          ]
        }
      },
      sort: [
        { access_count: { order: 'desc' } },
        { repo_stars: { order: 'desc' } },
        { indexed_at: { order: 'desc' } }
      ],
      size: 20
    }

    // Add filters
    if (filters.language) {
      searchBody.query.bool.filter = [
        { term: { repo_language: filters.language } }
      ]
    }

    if (filters.is_popular !== undefined) {
      if (!searchBody.query.bool.filter) {
        searchBody.query.bool.filter = []
      }
      searchBody.query.bool.filter.push({ term: { is_popular: filters.is_popular } })
    }

    const response = await client.search({
      index: REPOSITORY_INDEX,
      body: searchBody
    })

    const hits = (response as any).hits?.hits || (response as any).body?.hits?.hits || []
    return hits.map((hit: any) => ({
      ...(hit._source || {}),
      _score: hit._score
    }))
  } catch (error) {
    console.error('❌ Error searching repositories:', error)
    throw error
  }
}

// Search files within a repository
export async function searchFilesInRepository(
  repoId: string, 
  query: string, 
  fileType?: string,
  language?: string
): Promise<any[]> {
  try {
    const searchBody: any = {
      query: {
        bool: {
          must: [
            { term: { repo_id: repoId } }
          ]
        }
      },
      sort: [
        { _score: { order: 'desc' } },
        { 'file_path.keyword': { order: 'asc' } }
      ],
      size: 1000
    }

    // Query handling: treat empty or '*' as match_all within this repo
    const normalized = (query || '').trim()
    if (normalized && normalized !== '*') {
      if (!searchBody.query.bool.must) searchBody.query.bool.must = []
      searchBody.query.bool.must.push({
        multi_match: {
          query: normalized,
          fields: ['file_path^2', 'file_content'],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      })
    }

    // Add filters
    const filters: any[] = []
    if (fileType) {
      filters.push({ term: { file_type: fileType } })
    }
    if (language) {
      filters.push({ term: { file_language: language } })
    }

    if (filters.length > 0) {
      searchBody.query.bool.filter = filters
    }

    const response = await client.search({
      index: FILES_INDEX,
      body: searchBody
    })

    const hits = (response as any).hits?.hits || (response as any).body?.hits?.hits || []
    return hits.map((hit: any) => ({
      ...(hit._source || {}),
      _score: hit._score
    }))
  } catch (error) {
    console.error('❌ Error searching files:', error)
    throw error
  }
}

// Get file content by path
export async function getFileContent(repoId: string, filePath: string): Promise<any | null> {
  try {
    const response = await client.search({
      index: FILES_INDEX,
      body: {
        query: {
          bool: {
            must: [
              { term: { repo_id: repoId } },
              { term: { 'file_path.keyword': filePath } }
            ]
          }
        },
        size: 1
      }
    })

    const hits = (response as any).hits?.hits || (response as any).body?.hits?.hits || []
    if (hits.length > 0) {
      return hits[0]._source || null
    }
    return null
  } catch (error) {
    console.error('❌ Error getting file content:', error)
    throw error
  }
}

// Delete repository and its files from Elasticsearch
export async function deleteRepositoryFromIndex(repoId: string): Promise<void> {
  try {
    // Delete repository
    await client.delete({
      index: REPOSITORY_INDEX,
      id: repoId
    })

    // Delete all files for this repository
    await client.deleteByQuery({
      index: FILES_INDEX,
      body: {
        query: {
          term: { repo_id: repoId }
        }
      }
    })

    console.log(`✅ Deleted repository ${repoId} from Elasticsearch`)
  } catch (error) {
    console.error('❌ Error deleting repository from index:', error)
    throw error
  }
}

// Get repository statistics
export async function getRepositoryStats(): Promise<any> {
  try {
    const [repoStats, fileStats] = await Promise.all([
      client.count({ index: REPOSITORY_INDEX }),
      client.count({ index: FILES_INDEX })
    ])

    return {
      total_repositories: repoStats.body.count,
      total_files: fileStats.body.count
    }
  } catch (error) {
    console.error('❌ Error getting repository stats:', error)
    throw error
  }
}

export { client }
