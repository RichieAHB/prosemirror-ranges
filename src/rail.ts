import v4 from "uuid/v4";
import { Range } from "./range";
import { MoveTypes } from "./contants";

type RangeSpec = {
  from: number;
  to: number;
  type: string;
  id: string;
};

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

  // maps all the ranges based on a mapper that accepts positions and inside
  map(mapFrom: (pos: number) => number, mapTo = mapFrom) {
    return this.updateRanges(
      this.ranges.map(range => range.map(mapFrom, mapTo))
    ).removeEmpty();
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

    return this.updateRanges([
      ...this.removeSlice(from, to).ranges,
      new Range(id || id1 || id2 || this.getId(), from, to, type)
    ]).removeEmpty();
  }

  // removes by comparing object references, if nothing is removed then we get
  // the same rail reference back
  remove(toRemove: Range[] = []) {
    const ranges = this.ranges.filter(range => toRemove.indexOf(range) === -1);
    return this.count === ranges.length ? this : this.updateRanges(ranges);
  }

  rangeAt(pos: number, cursorBias = 0, predicate = (range: Range) => true) {
    return this.find(predicate, pos, pos, cursorBias);
  }

  find(
    predicate: (range: Range) => boolean,
    start = this.minPos,
    end = this.maxPos,
    cursorBias = 0
  ) {
    return (
      start &&
      end &&
      this.ranges.find(
        range => range.touches(start, end, cursorBias) && predicate(range)
      )
    );
  }

  get count() {
    return this.ranges.length;
  }

  get minPos() {
    return (
      !!this.count &&
      this.ranges.reduce((min, { from }) => Math.min(min, from), Infinity)
    );
  }

  get maxPos() {
    return (
      !!this.count &&
      this.ranges.reduce((max, { to }) => Math.max(max, to), -Infinity)
    );
  }

  // should not use the constructor publicly to protect against invalid overlapping
  private constructor(ranges: Range[] = [], getId: () => string = v4) {
    this.ranges = ranges;
    this.getId = getId;
  }

  // removes every range at this slice, ranges overlapping will be sliced
  // if nothing is removed
  private removeSlice(from: number, to: number) {
    return this.updateRanges(
      this.ranges.reduce(
        (acc, range) => [...acc, ...range.slice(from, to, this.getId)],
        [] as Range[]
      )
    );
  }

  private removeEmpty() {
    const ranges = this.ranges.filter(({ isEmpty }) => !isEmpty);
    return ranges.length === this.count ? this : this.updateRanges(ranges);
  }

  private updateRanges(ranges: Range[]) {
    return new Rail(ranges, this.getId);
  }
}

export { Rail };
