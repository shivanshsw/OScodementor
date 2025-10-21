// TypeScript types for GitHub API responses and application data

export interface GitHubRepository {
  id: number
  name: string
  full_name: string
  description: string | null
  stargazers_count: number
  language: string | null
  languages_url: string
  default_branch: string
  private: boolean
  html_url: string
  clone_url: string
  created_at: string
  updated_at: string
  pushed_at: string
}

export interface GitHubTreeItem {
  path: string
  mode: string
  type: "blob" | "tree"
  sha: string
  size?: number
  url: string
}

export interface GitHubTreeResponse {
  sha: string
  url: string
  tree: GitHubTreeItem[]
  truncated: boolean
}

export interface GitHubIssue {
  id: number
  number: number
  title: string
  body: string | null
  state: "open" | "closed"
  labels: Array<{
    id: number
    name: string
    color: string
  }>
  html_url: string
  created_at: string
  updated_at: string
  user: {
    login: string
    id: number
  }
}

export interface GitHubLanguage {
  [language: string]: number
}

// Application data interfaces (matching frontend expectations)
export interface RepoData {
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
  issues: Array<{
    title: string
    url: string
    labels: string[]
  }>
}

export interface ApiError {
  message: string
  status: number
  type: "NOT_FOUND" | "RATE_LIMITED" | "INVALID_URL" | "GITHUB_ERROR" | "UNKNOWN"
}

// GitHub API response types
export interface GitHubApiResponse<T> {
  data: T
  status: number
  headers: Record<string, string>
}

export interface GitHubRateLimit {
  limit: number
  remaining: number
  reset: number
  used: number
}

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public type: 'NOT_FOUND' | 'RATE_LIMITED' | 'INVALID_URL' | 'GITHUB_ERROR' | 'UNKNOWN'
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
