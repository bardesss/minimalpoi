/** The routes page chunk. Shared by the lazy route and by prefetching, so a
 * prefetch warms exactly the module the route later renders. */
export const loadRoutesPage = () => import("./RoutesPage");
