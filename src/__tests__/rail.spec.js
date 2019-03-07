const { Rail } = require("../rail");
const { Range } = require("../range");

let id;

const createRail = (...specs) => {
  id = 0;
  return Rail.create(
    specs.map(([from, to, type]) => new Range(id++, from, to, type))
  );
};
const describeRail = rail =>
  rail.reduce(
    (desc, r) => ({
      ...desc,
      [r.type]: (desc[r.type] || []).concat(r.from, r.to)
    }),
    {}
  );

describe("Rail", () => {
  describe("count", () => {
    it("returns the amount of ranges in the rail", () => {
      const r1 = Rail.empty();
      const r2 = r1.add(new Range("id", 0, 1));
      expect(r2.count).toBe(1);
    });
  });

  describe("min", () => {
    it("returns the minimum position of a range in a rail", () => {
      const rail = createRail([2, 5, "a"], [5, 10, "a"], [3, 7, "b"]);
      expect(rail.min).toBe(2);
    });
  });

  describe("max", () => {
    it("returns the maximum position of a range in a rail", () => {
      const rail = createRail([2, 5, "a"], [5, 10, "a"], [3, 7, "b"]);
      expect(rail.max).toBe(10);
    });
  });

  describe("add", () => {
    it("returns a new rail with the range added", () => {
      const r1 = Rail.empty();
      const r2 = r1.add(new Range("id", 0, 1));
      expect(r1).not.toBe(r2);
      expect(r2.count).toBe(1);
    });

    // it keeps ids where possible
    // it normalises
    // it allows adding adjacent when types are different
  });

  // describe map
  // describe forEach
  // describe reduce
  // describe removeSlice
  // describe rangeAt

  describe("create", () => {
    it("creates a rail with an array of ranges and normalizes their positions", () => {
      const rail = createRail(
        [0, 5, "a"],
        [5, 10, "a"],
        [3, 7, "b"],
        [11, 11, "b"]
      );
      expect(describeRail(rail)).toEqual({
        a: [0, 3, 7, 10],
        b: [3, 7]
      });
    });
  });
});
