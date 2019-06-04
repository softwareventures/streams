export type Emitter<T> = (emit: (element: T) => void, end: () => void) => void;

export interface Sink<T> {
    element(element: T): void;

    end(): void;
}

export class Stream<T> {
    private prebuffer: T[] | null = [];
    private sinks: Array<Sink<T>> | null = [];

    constructor(emitter: Emitter<T>) {
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