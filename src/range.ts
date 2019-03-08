class Range {
  readonly id: string;
  readonly from: number;
  readonly to: number;
  readonly type: string;

  // consistent API with rails and rail-sets :)
  static create(id: string, from: number, to: number, type: string) {
    return new Range(id, from, to, type);
  }

  constructor(id: string, from: number, to: number, type: string) {
    this.id = id;
    this.from = from;
    this.to = to;
    this.type = type;
  }

  // Takes a function to map positions, if the positions don't change then we
  // get the same object ref back
  map(mapFrom: (pos: number) => number, mapTo = mapFrom) {
    const from = mapFrom(this.from);
    const to = mapTo(this.to);
    return this.from === from && this.to === to
      ? this
      : new Range(this.id, from, to, this.type);
  }

  slice(min: number, max: number, id: string | (() => string)) {
    const before = this.removeAfter(min);
    const after = before
      ? this.removeBefore(max).updateId(typeof id === "function" ? id() : id)
      : this.removeBefore(max);

    return [before, after].filter(({ isEmpty }) => !isEmpty);
  }

  eq(range: Range) {
    return (
      this.from === range.from &&
      this.to === range.to &&
      this.type === range.type
    );
  }

  touches(start: number, end: number, cursorBias = 0) {
    return (
      (start < this.to || (start === this.to && cursorBias < 0)) &&
      (end > this.from || (end === this.from && cursorBias > 0))
    );
  }

  get isEmpty() {
    return this.from >= this.to;
  }

  get size() {
    return this.to - this.from;
  }

  private updateId(id: string) {
    return new Range(id, this.from, this.to, this.type);
  }

  private removeAfter(max: number) {
    return this.map(pos => Math.min(max, pos));
  }

  private removeBefore(min: number) {
    return this.map(pos => Math.max(min, pos));
  }
}

export { Range };
