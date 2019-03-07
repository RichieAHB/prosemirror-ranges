import { Rail } from "./rail";
import { Range } from "./range";
import { MoveTypes } from "./contants";
import { MarkType, Node } from "prosemirror-model";
import { readRangesFromDoc } from "./utils/state";

const getCursor = (from: number, to: number) => (from === to ? from : null);

// handles cursoring through the ends of ranges and into other ranges

// add a placeholder spec!

class RailSet {
  readonly cursorBias: number;
  private from: number;
  private to: number;
  readonly rails: { [name: string]: Rail };

  static fromDoc(
    markTypes: { [railName: string]: MarkType },
    doc: Node,
    getId?: () => string
  ) {
    return RailSet.create(
      Object.entries(markTypes).reduce(
        (acc, [railName, markType]) => ({
          ...acc,
          [railName]: Rail.create(readRangesFromDoc(doc, markType), getId)
        }),
        {} as { [railName: string]: Rail }
      )
    );
  }

  static empty(from = 0, to = from) {
    return new RailSet({}, from, to, 0);
  }

  static create(rails: { [name: string]: Rail }, from = 0, to = from) {
    // -Infinity means we'll always return false for a cursor move
    // updateCursor will update the cursorBias
    return Object.entries(rails)
      .reduce(
        (railSet, [name, rail]) => railSet.setRail(name, rail),
        RailSet.empty(-Infinity)
      )
      .updateSelection(from, to);
  }

  updateCursor(pos: number) {
    return this.updateSelection(pos, pos);
  }

  get cursor() {
    return getCursor(this.from, this.to);
  }

  map(mapper: (pos: number, bias: number) => number) {
    return new RailSet(
      Object.entries(this.rails).reduce(
        (acc, [name, rail]) => ({
          ...acc,
          [name]: rail.map(pos => mapper(pos, -this.cursorBias))
        }),
        {}
      ),
      this.from,
      this.to,
      this.cursorBias
    );
  }

  updateSelection(from: number, to: number) {
    if (this.from === from && this.to === to) {
      return this;
    }
    const { cursor: prevCursor } = this;
    const cursor = getCursor(from, to);
    if (prevCursor === null || cursor === null) {
      // we're got a selection and not a cursor
      return new RailSet(this.rails, from, to, 0);
    }
    const { pos, bias } = this.getNextCursorSpec(prevCursor, cursor);
    return new RailSet(this.rails, pos, pos, bias);
  }

  getRail(railName: string) {
    return this.rails[railName];
  }

  // overwrite or add a rail
  setRail(railName: string, rail: Rail) {
    return new RailSet(
      {
        ...this.rails,
        [railName]: rail
      },
      this.from,
      this.to,
      this.cursorBias
    );
  }

  // insert a range
  toggle(railName: string, type: string) {
    // this expects the rail to exist already
    const rail = this.getRail(railName);
    if (!rail) {
      throw new Error(`Rail with name ${railName} not found, add it first`);
    }

    return this.setRail(
      railName,
      rail.toggle(this.from, this.to, this.cursorBias, type)
    );
  }

  rangeAt(railName: string, pos: number) {
    return this.getRail(railName).rangeAt(pos, this.cursorBias);
  }

  // helper for getting all of the rails without needing their keys
  get allRails() {
    // again could cache
    return Object.values(this.rails);
  }

  get allRailNames() {
    return Object.keys(this.rails);
  }

  get ranges() {
    // this is cacheable if needs be
    return this.allRails.reduce(
      (ranges, rail) => [...ranges, ...rail.ranges],
      [] as Range[]
    );
  }

  /* Private */

  // should not use constructor in order to avoid incorrect `cursorBias` values
  constructor(
    rails: { [name: string]: Rail },
    from: number,
    to: number,
    cursorBias: number = 0
  ) {
    this.rails = rails;
    this.from = from;
    this.to = to;
    this.cursorBias = cursorBias;
  }

  getNextCursorSpec(pos: number, candidatePos: number) {
    const { cursorBias } = this;
    const offset = candidatePos - pos;

    // if this isn't a nudge then always bias to outside
    if (Math.abs(offset) !== 1) {
      return {
        pos: candidatePos,
        bias: 0
      };
    }

    const infos = this.allRails.map(r =>
      r.getMoveType(pos, offset, cursorBias)
    );

    const hasBetween = infos.includes(MoveTypes.BETWEEN);
    const hasIn = infos.includes(MoveTypes.IN);
    const hasOut = infos.includes(MoveTypes.OUT);

    if (hasBetween || (hasIn && hasOut)) {
      return {
        pos,
        bias: 0
      };
    }

    if (hasIn || hasOut) {
      return {
        pos,
        bias: offset
      };
    }

    return {
      pos: candidatePos,
      bias: -Math.sign(offset)
    };
  }
}

export { RailSet };
