const { RailSet } = require("../rail-set");
const { Rail } = require("../rail");
const { Range } = require("../range");

// posSpecs is an array of [pos, ranges] where pos is expected cursor position
// after cursoring right and ranges is a map of railName to expected range id

// this helper will then takes a railSet and will attempt to cursor forward
// through it, checking against one posSpec per attempted cursor move

// it will then reverse the posSpecs and cursor backward
const testCursoringForwardAndBackward = (...posSpecs) => railSet => {
  const testDirection = (specs, dir, rs1) =>
    specs.reduce((rs2, [pos, rangeIds]) => {
      const rs3 = rs2.updateCursor(rs2.cursor + Math.sign(dir));
      expect(rs3.cursor).toBe(pos);
      rs3.allRailNames.forEach(railName => {
        const rangeId = rangeIds[railName];
        if (rangeId) {
          expect(rs3.rangeAt(railName, pos).id).toBe(rangeId);
        } else {
          expect(rs3.rangeAt(railName, pos)).toBeUndefined();
        }
      });
      return rs3;
    }, rs1);

  const afterRight = testDirection(posSpecs, 1, railSet);
  const reversePosSpecs = posSpecs.slice(0, posSpecs.length - 1).reverse();

  testDirection(reversePosSpecs, -1, afterRight);
};

const createRangeSpec = (id, from, to, type) => ({
  id,
  from,
  to,
  type
});

describe("RailSet", () => {
  it("cursors correctly with one rail", () => {
    const rs = RailSet.create({
      a: Rail.create([
        createRangeSpec("1", 1, 2, "a"),
        createRangeSpec("2", 3, 4, "a"),
        createRangeSpec("3", 4, 5, "b")
      ])
    });

    testCursoringForwardAndBackward(
      [1, {}],
      [1, { a: "1" }],
      [2, { a: "1" }],
      [2, {}],
      [3, {}],
      [3, { a: "2" }],
      [4, { a: "2" }],
      [4, {}],
      [4, { a: "3" }],
      [5, { a: "3" }],
      [5, {}]
    )(rs);
  });

  it("cursors correctly with multiple rails", () => {
    const rs = RailSet.create({
      a: Rail.create([
        createRangeSpec("1", 1, 2, "a"),
        createRangeSpec("2", 3, 4, "a"),
        createRangeSpec("3", 4, 6, "b")
      ]),
      b: Rail.create([
        createRangeSpec("4", 3, 4, "a"),
        createRangeSpec("5", 5, 7, "a"),
        createRangeSpec("6", 7, 9, "b")
      ]),
      c: Rail.create([createRangeSpec("7", 7, 8, "a")])
    });

    testCursoringForwardAndBackward(
      [1, {}],
      [1, { a: "1" }],
      [2, { a: "1" }],
      [2, {}],
      [3, {}],
      [3, { a: "2", b: "4" }],
      [4, { a: "2", b: "4" }],
      [4, {}],
      [4, { a: "3" }],
      [5, { a: "3" }],
      [5, { a: "3", b: "5" }],
      [6, { a: "3", b: "5" }],
      [6, { b: "5" }],
      [7, { b: "5" }],
      [7, {}],
      [7, { b: "6", c: "7" }],
      [8, { b: "6", c: "7" }],
      [8, { b: "6" }],
      [9, { b: "6" }],
      [9, {}]
    )(rs);
  });
});
