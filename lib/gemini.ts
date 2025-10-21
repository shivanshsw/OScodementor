// Gemini AI integration for intelligent code analysis and chat
import { GoogleGenAI } from "@google/genai"

// Initialize Gemini AI with primary key
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' })

// Optional secondary key for parallel operations
const genAISearch = process.env.GEMINI_API_KEY_SEARCH 
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY_SEARCH })
  : null

// Simple retry with exponential backoff for Gemini API calls
async function withGeminiRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseMs?: number } = {}
): Promise<T> {
  const retries = opts.retries ?? 3
  const baseMs = opts.baseMs ?? 1000
  let attempt = 0
  while (true) {
    try {
      return await fn()
    } catch (err: any) {
      attempt++
      const status = err?.status || err?.code
      // Don't retry on 400 (bad request) or 404 (not found)
      if (attempt > retries || status === 400 || status === 404) throw err
      // For 503 (overloaded) or 429 (rate limit), retry with backoff
      if (status === 503 || status === 429) {
        const delay = baseMs * Math.pow(2, attempt - 1)
        console.log(`Gemini API ${status}, retrying in ${delay}ms (attempt ${attempt}/${retries})`)
        await new Promise(r => setTimeout(r, delay))
        continue
      }
      throw err
    }
  }
}

export interface ChatContext {
  repoName: string
  repoDescription: string
  selectedFile?: string
  fileContent?: string
  skillLevel: 'beginner' | 'intermediate' | 'expert'
  conversationHistory?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  relevantFiles?: Array<{
    path: string
    content: string
    score?: number
  }>
  repoInsights?: {
    summary?: string | null
    quickstart?: string | null
    contributionGuide?: string | null
  }
}

export async function generateCodeResponse(
  question: string,
  context: ChatContext
): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured. Please add GEMINI_API_KEY to your environment variables.')
    }

    // Build context-aware prompt
    const systemPrompt = buildSystemPrompt(context)
    const userPrompt = buildUserPrompt(question, context)
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`

    // Use secondary key for search operations if available, otherwise primary
    const client = genAISearch || genAI
    
    const response = await withGeminiRetry(() => 
      client.models.generateContent({
        model: "gemini-2.0-flash",
        contents: fullPrompt,
      })
    )

    if (!response) return "Sorry, something went wrong with the AI service."
    return response.text
  } catch (error) {
    console.error('Error generating Gemini response:', error)
    throw new Error('Failed to generate AI response')
  }
}

function buildSystemPrompt(context: ChatContext): string {
  const skillLevelInstructions = {
    beginner: `You are a friendly coding mentor helping a beginner understand this codebase. Use simple language, avoid jargon, and explain concepts step-by-step. Be encouraging and supportive.`,
    intermediate: `You are a knowledgeable developer helping someone with intermediate skills understand this codebase. Provide technical details while keeping explanations clear and practical.`,
    expert: `You are a senior developer discussing this codebase with a fellow expert. Provide deep technical insights, architectural analysis, and advanced implementation details.`
  }

  return `You are CodeMentor, an AI assistant that helps developers understand GitHub repositories. 

${skillLevelInstructions[context.skillLevel]}

Repository Context:
- Repository: ${context.repoName}
- Description: ${context.repoDescription || 'No description available'}

CRITICAL RESPONSE RULES:
1. BE ASSERTIVE: Use definitive language. Prefer "it is/does" over "it seems/might/appears".
2. NO SPECULATION: Answer only from the provided code and context. If information is missing, say: "I don't have that information from the provided code."
3. NO HEDGING: Do NOT use: "maybe", "perhaps", "it seems", "appears to", "might", "likely", "probably".
4. GROUNDED ANSWERS: Reference specific files, functions, or lines when making claims.
5. CONFIDENT TONE: Be direct and authoritative in explanations.
6. FORMATTING: Use markdown formatting for better readability:
   - Use **bold** for important terms and concepts
   - Use *italic* for emphasis
   - Use \`code\` for inline code and code blocks with language specification
   - Use bullet points and numbered lists for structured information
   - Use > blockquotes for important notes or warnings

ASSERTIVE REWRITE EXAMPLES:
- Hedged: "It seems the API calls this function to fetch data."
  Assertive: "The API calls this function to fetch data."
- Hedged: "This might be the entry point."
  Assertive: "This is the entry point."
- Hedged: "The state probably resets here."
  Assertive: "The state resets here."

Available Context:
- Selected file: ${context.selectedFile || 'None'}
- Repository insights: ${context.repoInsights ? 'Available' : 'Not available'}
- Relevant files: ${context.relevantFiles?.length || 0} files found
- Conversation history: ${context.conversationHistory?.length || 0} previous messages
13. For "where is X" questions, provide specific file locations
14. Always ground your answers in the actual code provided

Remember: You're helping someone understand real code, so be accurate and practical. Reference specific files when making claims about the codebase.`
}

function buildUserPrompt(question: string, context: ChatContext): string {
  let prompt = `User Question: ${question}\n\n`

  // Handle selected file content
  if (context.selectedFile && context.fileContent) {
    prompt += `Currently viewing file: ${context.selectedFile}\n`
    // Send full content for selected file
    prompt += `File content:\n\`\`\`\n${context.fileContent}\n\`\`\`\n\n`
  }

  // Handle retrieved files for context
  if (context.relevantFiles && context.relevantFiles.length > 0) {
    console.log(`Adding ${context.relevantFiles.length} files to prompt`)
    context.relevantFiles.forEach(f => {
      console.log(`  - ${f.path}: ${f.content?.length || 0} chars`)
      if (!f.content || f.content.length === 0) {
        console.log(`File ${f.path} has no content`)
      }
    })
    
    prompt += `Relevant files from the repository:\n\n`
    
    context.relevantFiles.forEach((file, index) => {
      prompt += `${index + 1}. File: ${file.path}\n`
      if (file.content && file.content.length > 0) {
        prompt += `Content:\n\`\`\`\n${file.content}\n\`\`\`\n\n`
      } else {
        prompt += `Content: [No content available]\n\n`
      }
    })
    
    prompt += `Use these files to provide accurate, context-aware answers. Reference specific files when relevant.\n\n`
  }

  // Add repository insights if available
  if (context.repoInsights && (context.repoInsights.summary || context.repoInsights.quickstart || context.repoInsights.contributionGuide)) {
    prompt += `Repository insights (for grounding):\n\n`
    if (context.repoInsights.summary) {
      prompt += `Summary:\n${context.repoInsights.summary}\n\n`
    }
    if (context.repoInsights.quickstart) {
      prompt += `Quickstart:\n${context.repoInsights.quickstart}\n\n`
    }
    if (context.repoInsights.contributionGuide) {
      prompt += `Contribution Guide:\n${context.repoInsights.contributionGuide}\n\n`
    }
  }

  // Add conversation history
  if (context.conversationHistory && context.conversationHistory.length > 0) {
    prompt += `Previous conversation:\n`
    context.conversationHistory.slice(-3).forEach(msg => {
      prompt += `${msg.role}: ${msg.content}\n`
    })
    prompt += '\n'
  }

  return prompt
}

// Enhanced search and analysis functions
export async function analyzeRepositoryStructure(
  repoName: string,
  files: Array<{ path: string; type: string; content?: string }>
): Promise<string> {
  try {
    const fileList = files
      .filter(f => f.type === 'file')
      .map(f => f.path)
      .slice(0, 50) // Limit to first 50 files for analysis

    const prompt = `Analyze this repository structure and provide a high-level overview:

Repository: ${repoName}
Files: ${fileList.join(', ')}

Please provide:
1. What this project does (1-2 sentences)
2. Main technologies/frameworks used
3. Key directories and their purposes
4. Entry points (main files to look at first)
5. Architecture overview (if apparent)

Keep it concise and beginner-friendly.`

    // Use secondary key for structure analysis if available
    const client = genAISearch || genAI
    const response = await withGeminiRetry(() => 
      client.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      })
    )

    if (!response) return "Unable to analyze repository structure at this time."
    return response.text
  } catch (error) {
    console.error('Error analyzing repository structure:', error)
    return 'Unable to analyze repository structure at this time.'
  }
}

export async function explainFile(
  filePath: string,
  fileContent: string,
  repoContext: string
): Promise<string> {
  try {
    const prompt = `Explain this file in the context of the repository:

File: ${filePath}
Repository Context: ${repoContext}

File Content:
\`\`\`
${fileContent.substring(0, 3000)}
\`\`\`

Please provide:
1. What this file does
2. Key functions/classes and their purposes
3. How it fits into the overall project
4. Important patterns or concepts used
5. Any notable code quality or best practices

Keep the explanation clear and practical.`

    const response = await withGeminiRetry(() => 
      genAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      })
    )

    if (!response) return "Unable to explain this file at this time."
    return response.text
  } catch (error) {
    console.error('Error explaining file:', error)
    return 'Unable to explain this file at this time.'
  }
}

export async function suggestContributions(
  repoName: string,
  repoDescription: string,
  issues: Array<{ title: string; labels: string[] }>
): Promise<string> {
  try {
    const issueList = issues
      .filter(issue => issue.labels.some(label => 
        label.toLowerCase().includes('good first issue') || 
        label.toLowerCase().includes('beginner') ||
        label.toLowerCase().includes('help wanted')
      ))
      .slice(0, 10)

    const prompt = `Suggest good first contributions for this repository:

Repository: ${repoName}
Description: ${repoDescription}

Available Issues:
${issueList.map(issue => `- ${issue.title} (${issue.labels.join(', ')})`).join('\n')}

Please provide:
1. 3-5 specific contribution suggestions
2. Skills needed for each suggestion
3. Steps to get started
4. Files to look at first
5. How to test changes

Make it encouraging and actionable for beginners.`

    const response = await withGeminiRetry(() => 
      genAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      })
    )

    if (!response) return "Unable to suggest contributions at this time."
    return response.text
  } catch (error) {
    console.error('Error suggesting contributions:', error)
    return 'Unable to suggest contributions at this time.'
  }
}

// Generate insights from README if available, otherwise fallback to AI analysis
export async function generateInsightsFromReadme(
  repoName: string,
  readmeContent: string,
  files: Array<{ path: string; type: string }>
): Promise<{
  summary: string
  quickstart: string
  contributionGuide: string
}> {
  try {
    const prompt = `Extract key information from this README to create repository insights.

Repository: ${repoName}
README Content:
${readmeContent}

Files in repo: ${files.slice(0, 50).map(f => f.path).join(', ')}

Please provide THREE sections:

1. SUMMARY (2-3 sentences):
- What this project does
- Main purpose and key features
- Technology stack if mentioned

2. QUICKSTART (step-by-step setup):
- Prerequisites/requirements
- Installation steps
- How to run locally
- Basic usage

3. CONTRIBUTION_GUIDE (contribution process):
- How to contribute
- Development setup
- Code style/standards
- Where to ask questions

Format your response as:
SUMMARY: [your summary here]
QUICKSTART: [your quickstart here]
CONTRIBUTION_GUIDE: [your contribution guide here]`

    const response = await withGeminiRetry(() => 
      genAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      })
    )

    if (!response) {
      throw new Error('No response from AI')
    }

    const text = response.text
    const summary = extractSection(text, 'SUMMARY')
    const quickstart = extractSection(text, 'QUICKSTART')
    const contributionGuide = extractSection(text, 'CONTRIBUTION_GUIDE')

    return {
      summary: summary || 'Repository summary unavailable.',
      quickstart: quickstart || 'Quickstart guide unavailable.',
      contributionGuide: contributionGuide || 'Contribution guide unavailable.'
    }
  } catch (error) {
    console.error('Error generating insights from README:', error)
    throw error
  }
}

// Helper to extract section from AI response
function extractSection(text: string, sectionName: string): string {
  const regex = new RegExp(`${sectionName}:\\s*([\\s\\S]*?)(?=\\n[A-Z_]+:|$)`, 'i')
  const match = text.match(regex)
  return match ? match[1].trim() : ''
}

// Post-processor to enforce assertive tone while preserving code blocks and inline code
export function enforceAssertiveTone(text: string): string {
  try {
    const codeFence = /```[\s\S]*?```/g
    const codeBlocks = text.match(codeFence) || []
    const parts = text.split(codeFence)

    const hedges: Array<[RegExp, string]> = [
      [/\bit seems\b/gi, 'it is'],
      [/\bit appears\b/gi, 'it is'],
      [/\bseems to\b/gi, ''],
      [/\bappears to\b/gi, ''],
      [/\bperhaps\b/gi, ''],
      [/\bprobably\b/gi, ''],
      [/\blikely\b/gi, ''],
      [/\bmight\b/gi, ''],
      [/\bmay\b/gi, ''],
    ]

    const processInline = (segment: string): string => {
      const inlineFence = /`[^`]*`/g
      const inlineCodes = segment.match(inlineFence) || []
      const inlineParts = segment.split(inlineFence)
      const replaced = inlineParts.map(p => {
        let s = p
        for (const [re, rep] of hedges) {
          s = s.replace(re, rep)
        }
        return s.replace(/\s{2,}/g, ' ')
      })
      let out = ''
      for (let i = 0; i < replaced.length; i++) {
        out += replaced[i]
        if (i < inlineCodes.length) out += inlineCodes[i]
      }
      return out
    }

    const processed = parts.map(processInline)
    let result = ''
    for (let i = 0; i < processed.length; i++) {
      result += processed[i]
      if (i < codeBlocks.length) result += codeBlocks[i]
    }
    return result.trim()
  } catch {
    return text
  }
}