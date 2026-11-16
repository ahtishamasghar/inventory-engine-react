import { ArrowUpRight, BookOpen, CodeXml } from 'lucide-react'

const resources = [
  [
    'Frontend',
    'https://github.com/ahtishamasghar/inventory-engine-react',
    CodeXml,
  ],
  [
    'C++ backend',
    'https://github.com/ahtishamasghar/inventory-optimization-engine',
    CodeXml,
  ],
  [
    'Setup README',
    'https://github.com/ahtishamasghar/inventory-engine-react#readme',
    BookOpen,
  ],
]

export default function ProjectResources({ className = '' }) {
  return (
    <nav
      className={`project-resources ${className}`}
      aria-label="Project resources"
    >
      <span className="nav-label">PROJECT RESOURCES</span>
      {resources.map(([label, href, Icon]) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${label} (opens in a new tab)`}
        >
          <Icon size={18} aria-hidden="true" />
          <span>{label}</span>
          <ArrowUpRight
            size={15}
            className="resource-arrow"
            aria-hidden="true"
          />
        </a>
      ))}
    </nav>
  )
}
