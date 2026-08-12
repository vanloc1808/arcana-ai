# testing
- Frontend (Next.js/jest) component tests render through a `customRender` in `src/test-utils.tsx` that wraps everything in `AuthProvider`; since `AuthProvider` calls `usePathname`, any `jest.mock('next/navigation')` must mock every hook the providers use (`useRouter`, `usePathname`, `useSearchParams` as needed), not just the ones the component under test calls. Confidence: 0.8
