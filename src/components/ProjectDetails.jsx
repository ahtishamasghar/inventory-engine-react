import { ArrowUpRight, BookOpen } from 'lucide-react'

export const contributors = [
  { name: 'Ahtisham Asghar', initials: 'AA', roll: 'BSCY51F25S075' },
  { name: 'Abubakar Siddique', initials: 'AS', roll: 'BSCY51F25S058' },
]

export default function ProjectDetails({ onDocumentation }) {
  return (
    <section className="project-details" aria-labelledby="project-heading">
      <div className="project-intro">
        <span className="eyebrow">DSA FINALS PROJECT</span>
        <h2 id="project-heading">
          Dynamic Inventory <span>Optimization Engine</span>
        </h2>
        <button
          className="text-button project-explore"
          onClick={onDocumentation}
          aria-haspopup="dialog"
        >
          <BookOpen size={15} />
          Explore the project
          <ArrowUpRight size={14} />
        </button>
      </div>
      <div className="project-team" aria-label="Group 12 contributors">
        <div className="team-heading">
          <span className="group-badge">GROUP 12</span>
        </div>
        <div className="contributors">
          {contributors.map((person) => (
            <div className="contributor" key={person.roll}>
              <span className="contributor-avatar" aria-hidden="true">
                {person.initials}
              </span>
              <div>
                <h3>{person.name}</h3>
                <p>{person.roll}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
