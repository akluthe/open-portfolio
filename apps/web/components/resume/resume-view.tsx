import type { ReactNode } from 'react';
import type { ResumeDocument } from '@/lib/shared-types';

/**
 * Tailoring overlay options for the live, cut-aware editor preview. The public
 * `/r` and `/t` pages render with no opts (the `/t` data is already resolved);
 * the tailoring editor passes these so hidden entries/bullets render struck
 * through in vermillion instead of disappearing.
 */
export type ResumeViewOpts = {
  headline?: string;
  summary?: string;
  cutJobs?: Set<number>;
  cutBullets?: Record<number, Set<number>>;
  hiddenSections?: Set<string>;
  skillOrder?: number[];
  showCuts?: boolean;
};

type ResumeViewProps = {
  resume: ResumeDocument;
  opts?: ResumeViewOpts;
  /** Sheet padding override, e.g. "44px 52px 60px" for scaled previews. */
  pad?: string;
};

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="r-sec">
      <div className="r-label">
        <span>{label}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

function periodText(item: {
  period?: string;
  startDate?: string;
  endDate?: string;
}): string | null {
  if (item.period) return item.period;
  if (item.startDate || item.endDate) {
    return `${item.startDate ?? 'Present'}${item.endDate ? ` – ${item.endDate}` : ''}`;
  }
  return null;
}

export default function ResumeView({ resume, opts = {}, pad }: ResumeViewProps) {
  const hidden = opts.hiddenSections ?? new Set<string>();
  const cutJobs = opts.cutJobs ?? new Set<number>();
  const cutBullets = opts.cutBullets ?? {};
  const showCuts = opts.showCuts ?? false;

  const summary = opts.summary ?? resume.basics.summary ?? resume.summary;
  const headline = opts.headline ?? resume.basics.title;

  const experience = resume.experience
    .map((entry, index) => ({ entry, index }))
    .filter(({ index }) => showCuts || !cutJobs.has(index));

  const skillOrder =
    opts.skillOrder && opts.skillOrder.length > 0
      ? opts.skillOrder
      : resume.skills.map((_, i) => i);

  const links = resume.contact?.links ?? [];

  return (
    <div className="sheet">
      <div className="sheet-pad" style={pad ? { padding: pad } : undefined}>
        <header className="r-head">
          <div>
            <div className="r-kicker">Résumé · {resume.basics.name}</div>
            <h1 className="r-name">{resume.basics.name}</h1>
            <div className="r-title">{headline}</div>
          </div>
          <div className="r-contact">
            {resume.contact?.location && <div>{resume.contact.location}</div>}
            {resume.contact?.email && (
              <div className="c-acc">
                <a href={`mailto:${resume.contact.email}`}>{resume.contact.email}</a>
              </div>
            )}
            {resume.contact?.phone && <div>{resume.contact.phone}</div>}
            {resume.contact?.website && (
              <div className="c-acc">{resume.contact.website.replace(/^https?:\/\//, '')}</div>
            )}
            {links.map((link) => (
              <div className="c-acc" key={link.url}>
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              </div>
            ))}
          </div>
        </header>

        {!hidden.has('summary') && summary && (
          <Section label="Summary">
            <p className="r-summary" style={{ margin: 0 }}>
              {summary}
            </p>
          </Section>
        )}

        {!hidden.has('experience') && experience.length > 0 && (
          <Section label="Experience">
            {experience.map(({ entry, index }) => {
              const cut = cutJobs.has(index);
              const cb = cutBullets[index] ?? new Set<number>();
              const period = periodText(entry);
              const nested = entry.roles && entry.roles.length > 0;
              return (
                <div className={`r-job${cut ? ' is-cut' : ''}`} key={`${entry.company}-${index}`}>
                  <div className="r-job-top">
                    <div>
                      <div className="r-co">{entry.company}</div>
                      {!nested && <div className="r-role">{entry.role}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {period && <div className="r-period">{period}</div>}
                      {entry.location && <div className="r-loc">{entry.location}</div>}
                    </div>
                  </div>

                  {nested ? (
                    entry.roles!.map((sub, si) => {
                      const subPeriod = periodText(sub);
                      return (
                        <div className="r-subrole" key={`${entry.company}-${index}-${si}`}>
                          <div className="r-job-top">
                            <div className="r-role" style={{ fontStyle: 'italic' }}>
                              {sub.role}
                            </div>
                            {subPeriod && <div className="r-period">{subPeriod}</div>}
                          </div>
                          {sub.highlights.length > 0 && (
                            <ul className="r-bul">
                              {sub.highlights.map((h, hi) => (
                                <li key={hi}>{h}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    entry.highlights.length > 0 && (
                      <ul className="r-bul">
                        {entry.highlights
                          .map((h, hi) => ({ h, hi }))
                          .filter(({ hi }) => showCuts || !cb.has(hi))
                          .map(({ h, hi }) => (
                            <li className={!cut && cb.has(hi) ? 'cut-bul' : ''} key={hi}>
                              {h}
                            </li>
                          ))}
                      </ul>
                    )
                  )}
                </div>
              );
            })}
          </Section>
        )}

        {!hidden.has('skills') && resume.skills.length > 0 && (
          <Section label="Skills">
            <div className="r-skills">
              {skillOrder.map((i) => {
                const group = resume.skills[i];
                if (!group) return null;
                return (
                  <div className="r-skill" key={group.name}>
                    <div className="k">{group.name}</div>
                    {group.keywords.length > 0 && (
                      <div className="v">{group.keywords.join('  ·  ')}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {!hidden.has('projects') && resume.projects.length > 0 && (
          <Section label="Projects">
            {resume.projects.map((project) => (
              <div className="r-proj" key={project.name}>
                <div>
                  <span className="pname">{project.name}</span>
                  {project.url && (
                    <a
                      className="plink"
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {project.url.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
                {project.description && <div className="pdesc">{project.description}</div>}
                {project.highlights.length > 0 && (
                  <ul className="r-bul">
                    {project.highlights.map((h, hi) => (
                      <li key={hi}>{h}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </Section>
        )}

        {!hidden.has('education') && resume.education.length > 0 && (
          <Section label="Education">
            {resume.education.map((edu) => (
              <div className="r-edu" key={`${edu.school}-${edu.degree ?? 'study'}`}>
                <div className="r-edu-top">
                  <span className="school">{edu.school}</span>
                  {edu.period && <span className="r-period">{edu.period}</span>}
                </div>
                {(edu.degree || edu.field) && (
                  <div className="deg">
                    {[edu.degree, edu.field].filter(Boolean).join(' · ')}
                  </div>
                )}
                {edu.highlights.length > 0 && (
                  <ul className="r-bul">
                    {edu.highlights.map((h, hi) => (
                      <li key={hi}>{h}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}
