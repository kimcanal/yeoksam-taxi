import {
  useSyncExternalStore,
  type Dispatch,
  type SetStateAction,
} from "react";

export type StoreApi<State extends object> = {
  getState: () => State;
  setState: (
    next:
      | Partial<State>
      | ((current: State) => Partial<State> | State),
  ) => void;
  setField: <Key extends keyof State>(key: Key, value: State[Key]) => void;
  subscribe: (listener: () => void) => () => void;
  useStore: <Selected>(selector: (state: State) => Selected) => Selected;
};

export function applySetStateAction<Value>(
  current: Value,
  next: SetStateAction<Value>,
): Value {
  return typeof next === "function"
    ? (next as (previous: Value) => Value)(current)
    : next;
}

export function createStore<State extends object>(
  initialState: State,
): StoreApi<State> {
  let state = initialState;
  const listeners = new Set<() => void>();

  const getState = () => state;

  const setState: StoreApi<State>["setState"] = (next) => {
    const partial =
      typeof next === "function" ? next(state) : next;
    const resolvedState =
      partial && typeof partial === "object"
        ? { ...state, ...partial }
        : state;

    if (Object.is(resolvedState, state)) {
      return;
    }

    state = resolvedState;
    listeners.forEach((listener) => listener());
  };

  const setField: StoreApi<State>["setField"] = (key, value) => {
    if (Object.is(state[key], value)) {
      return;
    }

    state = {
      ...state,
      [key]: value,
    };
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const useStore = <Selected,>(selector: (current: State) => Selected) =>
    useSyncExternalStore(
      subscribe,
      () => selector(state),
      () => selector(initialState),
    );

  return {
    getState,
    setState,
    setField,
    subscribe,
    useStore,
  };
}

export function createFieldSetter<State extends object, Key extends keyof State>(
  store: StoreApi<State>,
  key: Key,
): Dispatch<SetStateAction<State[Key]>> {
  return (next) => {
    const current = store.getState();
    store.setField(key, applySetStateAction(current[key], next));
  };
}
