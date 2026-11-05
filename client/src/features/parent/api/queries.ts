import { useQuery } from '@tanstack/react-query';
import { parentApi } from './parentApi';

// The key starts with "student" like the other calls about a child, so a new person clears it.
export const useChildren = () =>
  useQuery({ queryKey: ['student', 'children'], queryFn: parentApi.children });

/**
 * One child of the signed-in parent. `status` says what the screen should do: wait, show an
 * error, show "no access" (the child is not on the list, whatever the reason), or show the child.
 * The server refuses every call about someone else's child as well; this only decides the page.
 */
export function useChild(childId: string) {
  const children = useChildren();
  const child = children.data?.children.find((item) => item.id === childId);
  const status = children.isPending
    ? ('loading' as const)
    : children.isError
      ? ('error' as const)
      : child
        ? ('found' as const)
        : ('forbidden' as const);
  return { status, child, retry: () => void children.refetch() };
}
