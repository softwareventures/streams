import {copy} from "@softwareventures/array";

export type Emitter<T> = (emit: (element: T) => void, end: () => void) => void;

export interface Sink<T> {
    element(element: T): void;

    end(): void;
}

export class Stream<T> {
    private prebuffer: T[] | null = [];
    private sinks: Array<Sink<T>> | null = [];

    constructor(emitter: Emitter<T>, initial?: ArrayLike<T>) {
        if (initial != null) {
            this.prebuffer = copy(initial);
        }

        emitter(element => {
            if (this.prebuffer != null) {
                this.prebuffer.push(element);
            } else if (this.sinks != null) {
                this.sinks.forEach(sink => sink.element(element));
            }
        }, () => {
            if (this.sinks != null) {
                this.sinks.forEach(sink => sink.end());
            }

            this.sinks = null;
        });
    }

    public to(sink: Sink<T>): void {
        if (this.prebuffer != null) {
            this.prebuffer.forEach(element => sink.element(element));
            setImmediate(() => this.prebuffer = null);
        }

        if (this.sinks == null) {
            sink.end();
        } else {
            this.sinks.push(sink);
        }
    }
}

export function empty(): Stream<never> {
    return new Stream((emit, end) => end());
}

export function filter<T>(stream: Stream<T>, predicate: (element: T) => boolean): Stream<T> {
    return new Stream((emit, end) => stream.to({
        element: element => {
            if (predicate(element)) {
                emit(element);
            }
        },
        end
    }));
}

export function map<T, U>(stream: Stream<T>, f: (element: T) => U): Stream<U> {
    return new Stream((emit, end) => stream.to({
        element: element => emit(f(element)),
        end
    }));
}

export function interleaveMap<T, U>(stream: Stream<T>, f: (element: T) => Stream<U>): Stream<U> {
    return new Stream((emit, end) => {
        let substreams = 0;
        let sourceEnded = false;

        function maybeEnd(): void {
            if (substreams === 0 && sourceEnded) {
                end();
            }
        }

        stream.to({
            element: (element: T) => {
                ++substreams;
                f(element).to({
                    element: emit,
                    end: () => {
                        --substreams;
                        maybeEnd();
                    }
                });
            },
            end: () => {
                sourceEnded = true;
                maybeEnd();
            }
        });
    });
}

export function streamArray<T>(array: ArrayLike<T>): Stream<T> {
    return new Stream((emit, end) => end(), array);
}

export function streamPromise<T>(promise: Promise<T>): Stream<T> {
    return new Stream((emit, end) => promise
        .then(value => {
            emit(value);
            end();
        }));
}

export function interleavePromises<T>(promises: Stream<Promise<T>>): Stream<T> {
    return new Stream((emit, end) => {
        let promiseCount = 0;
        let sourceEnded = false;

        function maybeEnd(): void {
            if (sourceEnded && promiseCount === 0) {
                end();
            }
        }

        promises.to({
            element: promise => {
                ++promiseCount;
                promise.then(value => {
                    emit(value);
                    --promiseCount;
                    maybeEnd();
                });
            },
            end: () => {
                sourceEnded = true;
                maybeEnd();
            }
        });
    });
}