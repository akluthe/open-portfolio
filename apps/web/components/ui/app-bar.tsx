import type { ReactNode } from 'react';
import Icon from '@/components/ui/icon';

type AppBarProps = {
  /** Which top-nav item is active. */
  active?: 'Resumes' | 'Tailoring';
  /** Right-hand slot — typically the avatar / logout control. */
  right?: ReactNode;
};

const NAV: Array<{ label: 'Resumes' | 'Tailoring'; href: string }> = [
  { label: 'Resumes', href: '/r/main' },
  { label: 'Tailoring', href: '/admin/tailoring' }
];

/**
 * Letterpress top bar: serif wordmark with the vermillion-dot mark, primary nav,
 * and a right-hand slot for the user controls. The signature vermillion rail is
 * drawn by `.appbar::after` in globals.css.
 */
export default function AppBar({ active, right }: AppBarProps) {
  return (
    <header className="appbar">
      <a className="brand" href="/r/main" aria-label="Open Portfolio home">
        <span className="brand-mark">
          O<span className="dot">.</span>
        </span>
        <span className="brand-word">Open Portfolio</span>
      </a>
      <nav className="appnav">
        {NAV.map((item) => (
          <a key={item.label} href={item.href} className={item.label === active ? 'active' : ''}>
            {item.label}
          </a>
        ))}
      </nav>
      <div className="appbar-spacer" />
      <div className="appbar-search">
        <Icon name="search" size={15} /> Search resumes <span className="k">⌘K</span>
      </div>
      {right}
    </header>
  );
}
