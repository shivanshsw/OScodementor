# CodeMentor

A powerful AI-powered code repository analyzer and mentor that helps developers understand, explore, and learn from GitHub repositories using advanced AI technology.

##  Features

- **AI-Powered Code Analysis**: Get intelligent insights about any GitHub repository
- **Repository Indexing**: Automatically index and search through repository files
- **Interactive Chat Interface**: Ask questions about code, architecture, and implementation
- **File Explorer**: Browse repository structure with syntax highlighting
- **Smart Search**: Find specific code patterns, functions, or files across the repository
- **Repository Insights**: Get summaries, quickstart guides, and contribution tips
- **Multi-Language Support**: Works with repositories in any programming language

##  Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, PostgreSQL
- **Search Engine**: Elasticsearch
- **AI Integration**: Google Gemini API
- **Database**: PostgreSQL with connection pooling
- **Deployment**: Vercel
- **GitHub Integration**: Octokit REST API

##  Prerequisites

Before running this project, make sure you have:

- Node.js 18+ installed
- PostgreSQL database
- Elasticsearch instance
- GitHub Personal Access Token
- Google Gemini API Key

##  Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/codementor

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your_password

# GitHub API
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_API_BASE_URL=https://api.github.com

# AI Integration
GEMINI_API_KEY=your_gemini_api_key

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/codementor.git
cd codementor
```

### 2. Install Dependencies

```bash
npm install
# or
pnpm install
```

### 3. Set Up Database

```bash
# Run the database initialization script
node scripts/init-db.js
```

### 4. Set Up Elasticsearch

Make sure Elasticsearch is running on your system. The application will automatically create the required indices on first run.

### 5. Run the Development Server

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
codementor/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── admin/         # Admin endpoints
│   │   ├── background-index/ # Background indexing
│   │   ├── index-repo/    # Repository indexing
│   │   ├── index-status/  # Indexing status
│   │   └── query-ai/      # AI query endpoint
│   ├── admin/             # Admin dashboard
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── chat-window.tsx   # Chat interface
│   ├── file-explorer.tsx # File browser
│   └── landing-page.tsx  # Landing page
├── lib/                  # Utility libraries
│   ├── database.ts       # Database operations
│   ├── elasticsearch.ts  # Search functionality
│   ├── github.ts         # GitHub API integration
│   ├── gemini.ts         # AI integration
│   └── types.ts          # TypeScript types
└── scripts/              # Utility scripts
```

## 🔍 How It Works

### 1. Repository Indexing

When you submit a GitHub repository URL:

1. **Repository Analysis**: The system fetches repository metadata, file structure, and content
2. **Content Processing**: Files are processed and indexed in Elasticsearch
3. **AI Insights**: Repository insights are generated using AI
4. **Search Index**: All content is made searchable

### 2. AI-Powered Chat

- **Context-Aware**: Understands the repository structure and content
- **Code-Specific**: Provides detailed explanations of code patterns
- **Multi-File Analysis**: Can analyze relationships between files
- **Learning-Focused**: Adapts explanations to your skill level

### 3. Search & Discovery

- **Full-Text Search**: Search across all repository files
- **Semantic Search**: Find conceptually related code
- **File Navigation**: Browse repository structure
- **Quick Actions**: Get summaries, architecture overviews, and contribution tips

## 🎯 Usage Examples

### Basic Repository Analysis

1. Enter a GitHub repository URL (e.g., `https://github.com/vercel/next.js`)
2. Wait for indexing to complete
3. Start asking questions about the codebase

### Example Questions

- "How does the authentication system work?"
- "What is the main architecture of this project?"
- "Show me examples of error handling"
- "How do I contribute to this project?"
- "What are the main dependencies?"

### Quick Actions

- **Summarize**: Get a high-level overview of the repository
- **Architecture**: Understand the project structure
- **Contribution Guide**: Learn how to contribute
- **Quickstart**: Get started with the project

## 🚀 Deployment

### Vercel Deployment

1. **Connect Repository**: Link your GitHub repository to Vercel
2. **Set Environment Variables**: Add all required environment variables in Vercel dashboard
3. **Deploy**: Vercel will automatically deploy your application

### Environment Variables for Production

Make sure to set these in your Vercel dashboard:

- `DATABASE_URL`: Your production PostgreSQL connection string
- `ELASTICSEARCH_URL`: Your Elasticsearch instance URL
- `GITHUB_TOKEN`: Your GitHub personal access token
- `GEMINI_API_KEY`: Your Google Gemini API key
- `NEXT_PUBLIC_BASE_URL`: Your Vercel domain (e.g., `https://your-app.vercel.app`)

## 🔧 API Endpoints

### Repository Management

- `POST /api/index-repo`: Index a new repository
- `POST /api/index-status`: Check indexing status
- `POST /api/background-index`: Background indexing worker

### AI & Search

- `POST /api/query-ai`: Query the AI about repository content
- `POST /api/fetch-repo`: Fetch repository data
- `GET /api/debug`: Debug information

### Admin

- `GET /api/admin/repositories`: List all indexed repositories
- `POST /api/admin/clear-cache`: Clear application cache

## 🛠️ Development

### Running Tests

```bash
npm run test
```

### Database Schema

The application uses PostgreSQL with the following main tables:

- `indexed_repositories`: Repository metadata and indexing status
- `indexed_files`: Individual file content and metadata
- `indexing_progress`: Real-time indexing progress tracking

### Elasticsearch Indices

- `codementor_repositories`: Repository metadata
- `codementor_files`: File content for full-text search

##  Contributing (feel free to use if you want)

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License .




