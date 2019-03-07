import v4 from "uuid/v4";
import { Range } from "./range";
import { MoveTypes } from "./contants";

type RangeSpec = {
  from: number;
  to: number;
  type: string;
  id: string;
};

const notEmpty = <TValue>(value: TValue | null | undefined): value is TValue =>
  value !== null && value !== undefined;

class Rail {
  readonly ranges: Range[];
  private getId: () => string;

  static empty(getId?: () => string) {
    return new Rail([], getId);
  }

  static create(rangeSpecs: RangeSpec[], getId?: () => string) {
    return rangeSpecs.reduce(
      (rail, { id, from, to, type }) => rail.add(from, to, type, id),
      Rail.empty(getId)
    );
  }

  diff(b: Rail) {
    const a = this;
    return {
      a: a.ranges.filter(r => !b.ranges.includes(r)), // exist only in this
      b: b.ranges.filter(r => !a.ranges.includes(r)) // exist only in b
    };
  }

  // maps all the ranges based on a mapper that accepts positions and inside
  // if none of the mappings have any effect then we get the same object
  // reference back
  map(mapFrom: (pos: number) => number, mapTo = mapFrom) {
    const { ranges, didUpdate } = this.reduce(
      ({ ranges, didUpdate }, range) => {
        const range1 = range.map(from => mapFrom(from), to => mapTo(to));
        return {
          ranges: [...ranges, range1],
          didUpdate: didUpdate || range1 !== range
        };
      },
      {
        ranges: [] as Range[],
        didUpdate: false
      }
    );

    return didUpdate ? this.update(ranges).removeEmpty() : this;
  }

  forEach(fn: (range: Range, i: number, arr: Range[]) => void) {
    return this.ranges.forEach(fn);
  }

  reduce<T>(fn: (acc: T, range: Range) => T, init: T) {
    return this.ranges.reduce(fn, init);
  }

  toggle(from: number, to: number, cursorBias: number, type: string) {
    // if the cursor bias is 0 assume that we're inside a note position
    const rFrom = this.rangeAt(from, cursorBias || 1);
    const rTo = this.rangeAt(to, cursorBias || -1);

    if (!rFrom || !rTo || !rFrom.eq(rTo) || rFrom.type !== type) {
      return this.add(from, to, type);
    }

    return from === to ? this.remove([rFrom]) : this.removeSlice(from, to);
  }

  getMoveType(pos: number, dir: number, cursorBias: number) {
    const isInside = this.rangeAt(pos, cursorBias);
    const willBeInside = this.rangeAt(pos, dir);
    const canBeBetween =
      cursorBias + dir === 0 &&
      isInside &&
      willBeInside &&
      !this.rangeAt(pos, 0);

    if (canBeBetween) {
      return MoveTypes.BETWEEN;
    }
    if (isInside && !willBeInside) {
      return MoveTypes.OUT;
    }
    if (!isInside && willBeInside) {
      return MoveTypes.IN;
    }
    return MoveTypes.NONE;
  }

  /* Private */

  // Adds a new range to the rail, if we're adding a range of the same type
  // inside a range that is already there then nothing happens and we return the
  // same object reference
  add(start: number, end: number, type: string, id?: string) {
    const hasType = (range: Range) => range.type === type;
    const r1 = this.rangeAt(start, -1, hasType);

    if (r1 && (!id || r1.id === id) && r1 === this.rangeAt(end, 1, hasType)) {
      return this;
    }

    const { from, id: id1 } = this.rangeAt(start, -1, hasType) || {
      id: null,
      from: start
    };
    const { to, id: id2 } = this.rangeAt(end, 1, hasType) || {
      id: null,
      to: end
    };

    return this.update([
      ...this.remove(
        [this.find(from, to, 0, hasType)].filter(notEmpty)
      ).removeSlice(from, to).ranges,
      new Range(id || id1 || id2 || this.getId(), from, to, type)
    ]).removeEmpty();
  }

  // removes every range at this slice, ranges overlapping will be sliced
  // if nothing is removed
  removeSlice(from: number, to: number) {
    const { didUpdate, ranges } = this.reduce(
      ({ ranges, didUpdate }, range) => {
        const ranges1 = range.slice(from, to, this.getId);
        const [r1] = ranges1;
        return {
          ranges: [...ranges, ...ranges1],
          didUpdate: didUpdate || r1 !== range
        };
      },
      { ranges: [] as Range[], didUpdate: false }
    );

    return didUpdate ? this.update(ranges) : this;
  }

  rangeAt(pos: number, cursorBias = 0, predicate = (range: Range) => true) {
    return this.find(pos, pos, cursorBias, predicate);
  }

  // should not use the constructor publicly to protect against invalid overlapping
  constructor(ranges: Range[] = [], getId: () => string = v4) {
    this.ranges = ranges;
    this.getId = getId;
  }

  removeEmpty() {
    const ranges = this.ranges.filter(({ isEmpty }) => !isEmpty);
    return ranges.length === this.count ? this : this.update(ranges);
  }

  find(
    start = this.min,
    end = this.max,
    cursorBias = 0,
    predicate = (range: Range) => true
  ) {
    return this.ranges.find(
      range => range.touches(start, end, cursorBias) && predicate(range)
    );
  }

  // removes by comparing object references, if nothing is removed then we get
  // the same rail reference back
  remove(toRemove: Range[] = []) {
    const ranges = this.ranges.filter(range => toRemove.indexOf(range) === -1);
    return this.count === ranges.length ? this : this.update(ranges);
  }

  update(ranges: Range[], getId = this.getId) {
    return new Rail(ranges, getId);
  }

  get count() {
    return this.ranges.length;
  }

  get empty() {
    return this.count === 0;
  }

  get min() {
    return (
      this.count &&
      this.reduce((min, { from }) => Math.min(min, from), Infinity)
    );
  }

  get max() {
    return (
      this.count && this.reduce((max, { to }) => Math.max(max, to), -Infinity)
    );
  }
}

export { Rail };
