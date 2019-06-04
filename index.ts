export type Emitter<T> = (emit: (element: T) => void, end: () => void) => void;

export interface Sink<T> {
    element(element: T): void;

    end(): void;
}