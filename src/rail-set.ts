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
  readonly placeholderSpec: [string, Range] | null;

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
    return new RailSet({}, from, to, 0, null);
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

  handleUpdate(
    mapper: (pos: number, bias: number) => number,
    from: number,
    to: number
  ) {
    return this.map(mapper).updateSelection(from, to);
  }

  // convenience for tests
  updateCursor(pos: number) {
    return this.updateSelection(pos, pos);
  }

  get cursor() {
    return getCursor(this.from, this.to);
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
      this.cursorBias,
      this.placeholderSpec
    );
  }

  // insert a range
  toggle(railName: string, type: string) {
    // this expects the rail to exist already
    const rail = this.getRail(railName);
    if (!rail) {
      throw new Error(`Rail with name ${railName} not found, add it first`);
    }

    if (this.cursor !== null && !rail.rangeAt(this.cursor, this.cursorBias)) {
      return this.placeholderSpec
        ? this.removePlaceholder()
        : this.addPlaceholder(railName, type);
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
    cursorBias: number = 0,
    placeholder: [string, Range] | null
  ) {
    this.rails = rails;
    this.from = from;
    this.to = to;
    this.cursorBias = cursorBias;
    this.placeholderSpec = placeholder;
  }

  map(mapper: (pos: number, bias: number) => number) {
    // TODO: tidy
    // attempt to map the placeholder and add it,
    // it will be remove in any case where it hasn't been increased in size
    const placeholderSpec =
      this.placeholderSpec &&
      ([
        this.placeholderSpec[0],
        this.placeholderSpec[1].map(
          pos => mapper(pos, -1),
          pos => mapper(pos, 1)
        )
      ] as [string, Range]);

    return new RailSet(
      Object.entries(this.rails).reduce((acc, [railName, rail]) => {
        const rail2 = rail.map(
          pos => mapper(pos, 0.5 - this.cursorBias),
          pos => mapper(pos, -0.5 - this.cursorBias)
        );
        if (!placeholderSpec) {
          return {
            ...acc,
            [railName]: rail2
          };
        }

        const [placeholderRailName, placeholder] = placeholderSpec;

        const rail3 =
          placeholderRailName === railName
            ? rail.add(placeholder.from, placeholder.to, placeholder.type)
            : rail2;

        return {
          ...acc,
          [railName]: rail3
        };
      }, {}),
      this.from,
      this.to,
      this.cursorBias,
      placeholderSpec
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
      return new RailSet(this.rails, from, to, 0, null);
    }
    const { pos, bias } = this.getNextCursorSpec(prevCursor, cursor);
    return new RailSet(this.rails, pos, pos, bias, null);
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

  addPlaceholder(railName: string, type: string) {
    return new RailSet(this.rails, this.from, this.to, 1, [
      railName,
      Range.create("placeholder", this.from, this.from, type)
    ]);
  }

  removePlaceholder() {
    return new RailSet(this.rails, this.from, this.to, this.cursorBias, null);
  }
}

export { RailSet };
