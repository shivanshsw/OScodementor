"use client"
import { X } from "lucide-react"

interface SettingsPopupProps {
  isOpen: boolean
  onClose: () => void
  skillLevel: "beginner" | "intermediate" | "expert"
  onSkillLevelChange: (level: "beginner" | "intermediate" | "expert") => void
}

export default function SettingsPopup({ isOpen, onClose, skillLevel, onSkillLevelChange }: SettingsPopupProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="console-border bg-card/95 backdrop-blur-sm rounded-lg w-96 shadow-2xl">
        {/* Header */}
        <div className="console-border border-b px-6 py-4 flex items-center justify-between">
          <h2 className="console-text console-glow font-mono font-bold">{"> Settings"}</h2>
          <button onClick={onClose} className="console-text text-accent hover:text-accent/80 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4">
          <div>
            <label className="console-text text-sm text-muted-foreground block mb-3">
              {"Skill Level (AI Explanation Depth)"}
            </label>
            <div className="space-y-2">
              {(["beginner", "intermediate", "expert"] as const).map((level) => (
                <label
                  key={level}
                  className="console-text flex items-center gap-3 p-3 rounded-md cursor-pointer hover:bg-accent/10 transition-colors"
                >
                  <input
                    type="radio"
                    name="skill-level"
                    value={level}
                    checked={skillLevel === level}
                    onChange={() => onSkillLevelChange(level)}
                    className="w-4 h-4 accent-accent"
                  />
                  <span className="text-sm capitalize">
                    {level}
                    {level === "beginner" && " - Detailed explanations with basics"}
                    {level === "intermediate" && " - Balanced explanations"}
                    {level === "expert" && " - Technical deep dives"}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="console-border border-t px-6 py-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="console-text text-accent hover:text-accent/80 transition-colors hover:bg-accent/10 px-4 py-2 rounded-md"
          >
            {"Close"}
          </button>
        </div>
      </div>
    </div>
  )
}
