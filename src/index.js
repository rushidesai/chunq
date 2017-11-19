//@flow

class Iterable<T> implements AsyncIterable<Array<T>> {
  async [Symbol.asyncIterator](): AsyncIterator<Array<T>> {
      throw new Error('Abstract method');
  }

  async collect(): Promise<Array<T>> {
    let ret = [];
    for await (const chunk of this) {
      ret = ret.concat(...chunk);
    }
    return ret;
  }

  async collectChunks(): Promise<Array<Array<T>>> {
    let ret = [];
    for await (const chunk of this) {
      ret = ret.concat([chunk]);
    }
    return ret;
  }

  static from(...chunks: Array<Array<T>>): Iterable<T> {
    return new StaticIterable(...chunks);
  }

  filter(predicate: T=>bool): Iterable<T> {
    return new FilteredIterable(this, predicate);
  }

  map<Tnext>(transform: T=>Tnext): Iterable<Tnext> {
    return new MappedIterable(this, transform);
  }

  orderBy(
    ...fieldGetters: Array<(T=>any)|[T=>any,boolean]>
  ): Iterable<T> {
    return new OrderedIterable(this, fieldGetters);
  }

  concat(...rest: Array<Iterable<T>>): Iterable<T> {
    return new ConcatenatedIterable(...[this].concat(...rest));
  }
}

class AppliedIterable<Tin, Tout> extends Iterable<Tout> {
  source: Iterable<Tin>;

  constructor(source: Iterable<Tin>) {
    super();
    this.source = source;
  }

  apply(chunk: Array<Tin>): Array<Tout> {
    throw new Error('Abstract method');
  }

  async * [Symbol.asyncIterator](): AsyncIterator<Array<Tout>> {
    for await (const inChunk of this.source) {
      const outChunk = this.apply(inChunk);
      if (outChunk.length > 0) {
        yield outChunk;
      }
    }
  }
}

class FilteredIterable<T> extends AppliedIterable<T, T> {
  predicate: T=>bool;

  constructor(source: Iterable<T>, predicate: T=>bool) {
    super(source);
    this.predicate = predicate;
  }

  apply(chunk: Array<T>): Array<T> {
    return chunk.filter(this.predicate);
  }
}

class MappedIterable<Tin, Tout>
  extends AppliedIterable<Tin, Tout> {

  transform: Tin=>Tout;

  constructor(source: Iterable<Tin>, transform: Tin=>Tout) {
    super(source);
    this.transform = transform;
  }

  apply(chunk: Array<Tin>): Array<Tout> {
    return chunk.map(this.transform);
  }
}

class OrderedIterable<T> extends Iterable<T> {
  source: Iterable<T>;
  fieldGetters: Array<T=>any|[T=>any|boolean]>;
  directions: Map<number, bool>;

  constructor(
    source: Iterable<T>,
    fieldGetters: Array<(T=>any)|[T=>any,boolean]>,
    directions: ?Array<bool>,
  ) {
    super();
    this.source = source;
    this.fieldGetters = [];
    this.directions = new Map();
    for (let i = 0; i < fieldGetters.length; i++) {
      const fieldGetter = fieldGetters[i];
      if (Array.isArray(fieldGetter)) {
        this.fieldGetters.push(fieldGetter[0]);
        this.directions.set(i, fieldGetter[1]);
      } else {
        this.fieldGetters.push(fieldGetter);
      }
    }
  }

  async * [Symbol.asyncIterator](): AsyncIterator<Array<T>> {
    const chunk = await this.source.collect();
    let mapped = chunk.map((item, i) => {
      return {index: i, value: this.fieldGetters.map(getter => getter(item))};
    });
    mapped.sort(
      ({value: rankA}, {value: rankB}) => {
        for (let i = 0; i < rankA.length && i < rankB.length; ++i) {
          const a = rankA[i];
          const b = rankB[i];
          if (a < b) {
            if (this.directions.get(i)) {
              return 1;
            }
            return -1;
          }
          if (a > b) {
            if (this.directions.get(i)) {
              return -1;
            }
            return 1;
          }
        }
        return 0;
      }
    );
    yield mapped.map(({index}) => chunk[index]);
  }
}

class ConcatenatedIterable<T> extends Iterable<T> {
  sources: Array<Iterable<T>>;

  constructor(...sources: Array<Iterable<T>>) {
    super();
    this.sources = sources;
  }

  async * [Symbol.asyncIterator](): AsyncIterator<Array<T>> {
    for (const source of this.sources) {
      for await (const chunk of source) {
        yield chunk;
      }
    }
  }
}

class OrderedMergeIterable<T> extends Iterable<T> {
  sources: Array<Iterable<T>>;
  fieldGetters: Array<T=>any|[T=>any|boolean]>;
  directions: Map<number, bool>;

  constructor(
    sources: Array<Iterable<T>>,
    fieldGetters: Array<(T=>any)|[T=>any,boolean]>,
    directions: ?Array<bool>,
  ) {
    super();
    this.sources = sources;
    this.fieldGetters = [];
    this.directions = new Map();
    for (let i = 0; i < fieldGetters.length; i++) {
      const fieldGetter = fieldGetters[i];
      if (Array.isArray(fieldGetter)) {
        this.fieldGetters.push(fieldGetter[0]);
        this.directions.set(i, fieldGetter[1]);
      } else {
        this.fieldGetters.push(fieldGetter);
      }
    }
  }
}

class StaticIterable<T> extends Iterable<T> {
  chunks: Array<Array<T>>;

  constructor(...chunks: Array<Array<T>>) {
    super();
    this.chunks = chunks;
  }

  async * [Symbol.asyncIterator](): AsyncIterator<Array<T>> {
    for (const chunk of this.chunks) {
      yield chunk;
    }
  }
}

export default Iterable;
