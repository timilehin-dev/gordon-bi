// Standalone Zero-Dependency React Mock/Bridge for Desktop Environment

export type PropsWithChildren<P = {}> = P & { children?: any; key?: any };

export type FC<P = {}> = (props: PropsWithChildren<P>, context?: any) => any;

export type ReactNode = any;
export type ReactElement = any;

export interface FormEvent<T = any> {
  preventDefault(): void;
  stopPropagation(): void;
  target: T;
}

export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void] {
  const val = typeof initialState === 'function' ? (initialState as () => T)() : initialState;
  let state = val;
  const setState = (newState: T | ((prevState: T) => T)) => {
    state = typeof newState === 'function' ? (newState as (prevState: T) => T)(state) : newState;
  };
  return [state, setState];
}

export function useEffect(effect: () => void | (() => void), deps?: any[]): void {
  effect();
}

export function useMemo<T>(factory: () => T, deps: any[] | undefined): T {
  return factory();
}

export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T {
  return callback;
}

export function useRef<T>(initialValue?: T): { current: T | undefined } {
  return { current: initialValue };
}

export namespace React {
  export type FC<P = {}> = (props: PropsWithChildren<P>, context?: any) => any;
  export type PropsWithChildren<P = {}> = P & { children?: any; key?: any };
  export type ReactNode = any;
  export type ReactElement = any;
  export interface FormEvent<T = any> {
    preventDefault(): void;
    stopPropagation(): void;
    target: T;
  }
}

const React = {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
};

export default React;
