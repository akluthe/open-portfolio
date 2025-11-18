import type { ResumeDocument } from '@resume-platform/shared-types';

type ResumeViewProps = {
  resume: ResumeDocument;
};

function formatContact(resume: ResumeDocument) {
  const parts: string[] = [];

  if (resume.contact?.location) {
    parts.push(resume.contact.location);
  }

  if (resume.contact?.email) {
    parts.push(resume.contact.email);
  }

  if (resume.contact?.phone) {
    parts.push(resume.contact.phone);
  }

  if (resume.contact?.website) {
    parts.push(resume.contact.website);
  }

  return parts.join(' · ');
}

export default function ResumeView({ resume }: ResumeViewProps) {
  const contactLine = formatContact(resume);

  return (
    <article className="resume-shell">
      <header className="resume-header">
        <p className="resume-subtitle">Resume</p>
        <h1>{resume.basics.name}</h1>
        <p>{resume.basics.title}</p>
        {contactLine && <p>{contactLine}</p>}
      </header>

      {(resume.basics.summary || resume.summary) && (
        <section className="section">
          <h2>SUMMARY</h2>
          <p className="summary">{resume.basics.summary ?? resume.summary}</p>
        </section>
      )}

      {resume.experience.length > 0 && (
        <section className="section">
          <h2>EXPERIENCE</h2>
          {resume.experience.map((entry) => (
            <div className="experience-item" key={`${entry.company}-${entry.role}`}>
              <h3>{entry.role}</h3>
              <div className="experience-meta">
                <span>{entry.company}</span>
                {entry.location && <span>{entry.location}</span>}
                {entry.period && <span>{entry.period}</span>}
                {!entry.period && (entry.startDate || entry.endDate) && (
                  <span>
                    {entry.startDate ?? 'Present'}
                    {entry.endDate ? ` – ${entry.endDate}` : ''}
                  </span>
                )}
              </div>
              {entry.highlights.length > 0 && (
                <ul className="experience-highlights">
                  {entry.highlights.map((highlight, highlightIndex: number) => (
                    <li key={`${entry.company}-${highlightIndex}`}>{highlight}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {resume.skills.length > 0 && (
        <section className="section">
          <h2>SKILLS</h2>
          <ul className="skills-grid">
            {resume.skills.map((skill) => (
              <li key={skill.name}>
                <strong>{skill.name}</strong>
                {skill.keywords.length > 0 && (
                  <p>{skill.keywords.join(' · ')}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {resume.projects.length > 0 && (
        <section className="section">
          <h2>PROJECTS</h2>
          {resume.projects.map((project) => (
            <article key={project.name} className="experience-item">
              <h3>{project.name}</h3>
              {project.description && <p>{project.description}</p>}
              {project.highlights.length > 0 && (
                <ul className="experience-highlights">
                  {project.highlights.map((highlight, highlightIndex: number) => (
                    <li key={`${project.name}-${highlightIndex}`}>{highlight}</li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </section>
      )}

      {resume.education.length > 0 && (
        <section className="section">
          <h2>EDUCATION</h2>
          {resume.education.map((edu) => (
            <article key={`${edu.school}-${edu.degree ?? 'study'}`} className="experience-item">
              <h3>{edu.school}</h3>
              <div className="experience-meta">
                {edu.degree && <span>{edu.degree}</span>}
                {edu.field && <span>{edu.field}</span>}
                {edu.period && <span>{edu.period}</span>}
              </div>
              {edu.highlights.length > 0 && (
                <ul className="experience-highlights">
                  {edu.highlights.map((highlight, highlightIndex: number) => (
                    <li key={`${edu.school}-${highlightIndex}`}>{highlight}</li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </section>
      )}
    </article>
  );
}
