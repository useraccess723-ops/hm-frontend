import { useLocation, useNavigate } from 'react-router-dom';
import { NAV } from '../data/mock';
import { useRbac } from '../context/RbacContext';

/**
 * SubNav renders a sleek horizontal scrollable pills/tabs bar
 * for the current section and all of its sub-pages.
 *
 * @param {string} parentPath – e.g. '/bookings', '/front-desk'
 */
export default function SubNav({ parentPath }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { canView } = useRbac();

  /* Find the nav item matching this parent */
  let item = null;
  for (const g of NAV) {
    const found = g.items.find((it) => it.to === parentPath);
    if (found) { item = found; break; }
  }

  if (!item || !item.children || item.children.length === 0) return null;

  const isOverview = pathname === parentPath;
  const showOverview = canView(parentPath);
  const visibleChildren = item.children.filter((child) => canView(child.to));

  if (!showOverview && visibleChildren.length === 0) return null;

  return (
    <div className="subnav-pills-bar" role="tablist" aria-label={`${item.label} sub-navigation`}>
      {showOverview && (
        <button
          role="tab"
          aria-selected={isOverview}
          className={`subnav-pill ${isOverview ? 'active' : ''}`}
          onClick={() => navigate(parentPath)}
        >
          Overview
        </button>
      )}
      {visibleChildren.map((child) => {
        const isActive = pathname === child.to;
        return (
          <button
            key={child.to}
            role="tab"
            aria-selected={isActive}
            className={`subnav-pill ${isActive ? 'active' : ''}`}
            onClick={() => navigate(child.to)}
          >
            {child.label}
          </button>
        );
      })}
    </div>
  );
}
