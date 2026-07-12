import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Module-level singleton (not created inside the component) so code outside
// the React tree — specifically the auth store's logout path — can import it
// and clear cached data when the signed-in user changes. Without this, query
// keys like ['auth', 'me'] or ['dashboard-kpis'] are not user-scoped, so
// switching accounts in the same tab (logout -> login as someone else, no
// full page reload) served the PREVIOUS user's cached dashboard/session data
// until staleTime elapsed — the actual cause of "Admin and Employee see the
// same dashboard" (the per-role layout code was already correct).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export function QueryProvider({ children }: PropsWithChildren) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
