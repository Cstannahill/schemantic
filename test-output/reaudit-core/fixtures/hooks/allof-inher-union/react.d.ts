declare module 'react' {
export function useState<T>(initial: T): [T, (value: T) => void];
export function useRef<T>(initial: T): { current: T };
export function useCallback<T extends Function>(fn: T, deps: readonly unknown[]): T;
export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
}