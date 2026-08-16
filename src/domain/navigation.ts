export type NavigationItem = readonly [label: string, href: string];

export function routeMatches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function mostSpecificNavigationItem<T extends NavigationItem>(
  pathname: string,
  items: readonly T[],
) {
  return items.reduce<T | undefined>((best, item) => {
    if (!routeMatches(pathname, item[1])) return best;
    return !best || item[1].length > best[1].length ? item : best;
  }, undefined);
}
