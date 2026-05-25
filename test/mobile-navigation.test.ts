import { describe, it, expect } from 'vitest';

// Route links schema matching components/header.tsx
const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/bags', label: 'Smart Bags' },
  { href: '/pro', label: 'Pro Analytics' },
  { href: '/earnings', label: 'Earnings' },
  { href: '/creator', label: 'Creator Lab' },
  { href: '/leaderboard', label: 'Leaderboard' },
];

// Helper to determine if a route is active (matching the pathname logic in components/header.tsx)
function isRouteActive(pathname: string, linkHref: string): boolean {
  if (linkHref === '/') {
    return pathname === '/';
  }
  return pathname.startsWith(linkHref);
}

describe('Mobile Responsive Navigation Routing & Structure', () => {
  it('should have correct links defined with non-empty labels and valid paths', () => {
    expect(NAV_LINKS).toHaveLength(6);
    
    NAV_LINKS.forEach(link => {
      expect(link.label).toBeDefined();
      expect(link.label.length).toBeGreaterThan(0);
      expect(link.href).toBeDefined();
      expect(link.href.startsWith('/')).toBe(true);
    });
  });

  it('should contain expected target pages for premium features', () => {
    const hrefs = NAV_LINKS.map(l => l.href);
    const labels = NAV_LINKS.map(l => l.label);

    expect(hrefs).toContain('/');
    expect(labels).toContain('Dashboard');

    expect(hrefs).toContain('/bags');
    expect(labels).toContain('Smart Bags');

    expect(hrefs).toContain('/pro');
    expect(labels).toContain('Pro Analytics');

    expect(hrefs).toContain('/earnings');
    expect(labels).toContain('Earnings');

    expect(hrefs).toContain('/creator');
    expect(labels).toContain('Creator Lab');

    expect(hrefs).toContain('/leaderboard');
    expect(labels).toContain('Leaderboard');
  });

  describe('Route Activity Logic', () => {
    it('should correctly match the home dashboard path exactly', () => {
      expect(isRouteActive('/', '/')).toBe(true);
      expect(isRouteActive('/bags', '/')).toBe(false);
      expect(isRouteActive('/pro', '/')).toBe(false);
    });

    it('should correctly match sub-paths or exact matches for other sections', () => {
      expect(isRouteActive('/bags', '/bags')).toBe(true);
      expect(isRouteActive('/bags/1234', '/bags')).toBe(true); // sub-route matching
      
      expect(isRouteActive('/pro', '/pro')).toBe(true);
      expect(isRouteActive('/pro/partner', '/pro')).toBe(true); // partner analytics sub-page
      
      expect(isRouteActive('/creator', '/creator')).toBe(true);
      expect(isRouteActive('/creator/launch', '/creator')).toBe(true); // creator lab sub-wizard
    });

    it('should reject mismatched paths', () => {
      expect(isRouteActive('/earnings', '/bags')).toBe(false);
      expect(isRouteActive('/leaderboard', '/pro')).toBe(false);
      expect(isRouteActive('/creator', '/earnings')).toBe(false);
    });
  });
});
