declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare namespace React {
  export type FC<P = {}> = (props: P & { key?: any; children?: any }, context?: any) => any;

  export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useMemo<T>(factory: () => T, deps: any[] | undefined): T;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
  export function useRef<T>(initialValue?: T): { current: T };

  export interface FormEvent<T = Element> {
    preventDefault(): void;
    stopPropagation(): void;
    target: T;
  }

  export interface ReactNode {}
  export interface ReactElement {}
}

declare module 'react' {
  export = React;
}

declare module 'react/jsx-runtime' {
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
  export const Fragment: any;
}
