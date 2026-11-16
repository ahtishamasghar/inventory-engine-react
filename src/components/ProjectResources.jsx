import { ArrowUpRight, BookOpen, CodeXml } from 'lucide-react'

export default function ProjectResources({ onDocumentation, className = '' }) {
  return (
    <nav
      className={`project-resources ${className}`}
      aria-label="Project resources"
    >
      <span className="nav-label">PROJECT RESOURCES</span>
      <a
        href="https://github.com/ahtishamasghar/inventory-optimization-engine"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Backend source code (opens in a new tab)"
      >
        <CodeXml size={18} />
        <span>Source code</span>
        <ArrowUpRight size={15} className="resource-arrow" />
      </a>
      <button
        onClick={onDocumentation}
        aria-label="Documentation"
        aria-haspopup="dialog"
      >
        <BookOpen size={18} />
        <span>Documentation</span>
        <ArrowUpRight size={15} className="resource-arrow" />
      </button>
    </nav>
  )
}
