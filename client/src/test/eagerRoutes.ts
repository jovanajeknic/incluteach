import type { RouteObject } from 'react-router';
import { routes } from '@/app/routes';

/**
 * The real routes with every lazy page loaded up front, through the routes' own `lazy`
 * functions. Tests can then render any page synchronously, as before code splitting.
 */
async function resolveLazy(list: RouteObject[]): Promise<RouteObject[]> {
  return Promise.all(
    list.map(async (route) => {
      const { lazy, children, ...rest } = route;
      const loaded = typeof lazy === 'function' ? await lazy() : {};
      const resolved = { ...rest, ...loaded } as RouteObject;
      if (children) resolved.children = await resolveLazy(children);
      return resolved;
    }),
  );
}

export const eagerRoutes = await resolveLazy(routes);
