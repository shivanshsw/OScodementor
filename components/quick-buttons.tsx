"use client"

import type React from "react"

import { Lightbulb, GitBranch, Bug, FileText } from "lucide-react"

interface QuickButtonsProps {
  onButtonClick: (question: string) => void
  selectedFile: string | null
}

interface QuickButton {
  label: string
  question: string
  icon: React.ReactNode
}

export default function QuickButtons({ onButtonClick, selectedFile }: QuickButtonsProps) {
  const baseButtons: QuickButton[] = [
    {
      label: "Summarize Repo",
      question:
        "Provide a comprehensive summary of this repository, including its purpose, main features, and technology stack.",
      icon: <FileText size={16} />,
    },
    {
      label: "How to Contribute",
      question:
        "What are the best practices for contributing to this repository? Include setup instructions and guidelines.",
      icon: <GitBranch size={16} />,
    },
    {
      label: "Good First Issues",
      question: "What are some good first issues for a beginner to start contributing to this project?",
      icon: <Bug size={16} />,
    },
    {
      label: "Architecture",
      question:
        "Explain the overall architecture and structure of this project. How are the main components organized?",
      icon: <Lightbulb size={16} />,
    },
  ]

  const fileButtons: QuickButton[] = selectedFile
    ? [
        {
          label: "Explain File",
          question: `Explain the code in ${selectedFile}. What does it do and how does it work?`,
          icon: <FileText size={16} />,
        },
        {
          label: "Summarize File",
          question: `Provide a brief summary of ${selectedFile}. What are the key functions and their purposes?`,
          icon: <Lightbulb size={16} />,
        },
      ]
    : []

  const buttons = selectedFile ? [...baseButtons.slice(0, 2), ...fileButtons, ...baseButtons.slice(2)] : baseButtons

  return (
    <div className="grid grid-cols-2 gap-2">
      {buttons.map((btn, idx) => (
        <button
          key={idx}
          onClick={() => onButtonClick(btn.question)}
          className="console-text console-button rounded-md px-3 py-2 text-xs font-semibold hover:opacity-90 transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
          title={btn.question}
        >
          {btn.icon}
          <span>{btn.label}</span>
        </button>
      ))}
    </div>
  )
}
