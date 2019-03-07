const { Range } = require("../range");

describe("Range", () => {
  describe("map", () => {
    it("can be mapped with a mapping function", () => {
      const r1 = new Range("id", 0, 1);
      const r2 = r1.map(pos => pos + 1);
      expect(r2.from).toBe(1);
      expect(r2.to).toBe(2);
    });

    it("can take a mapping function for both `from` and `to`", () => {
      const r1 = new Range("id", 0, 1);
      const r2 = r1.map(from => from + 1, to => to + 2);
      expect(r2.from).toBe(1);
      expect(r2.to).toBe(3);
    });

    it("returns a new object unless mapping has no impact on the positions", () => {
      const r1 = new Range("id", 0, 1);
      const r2 = r1.map(pos => pos + 1);
      const r3 = r1.map(pos => pos);
      expect(r1).not.toBe(r2);
      expect(r1).toBe(r3);
    });

    it("allows ranges to be created with from greater than to", () => {
      const r1 = new Range("id", 0, 1);
      const r2 = r1.map(from => from + 1, to => to - 1);
      expect(r2.from).toBe(1);
      expect(r2.to).toBe(0);
    })
  });

  describe("slice", () => {
    it("returns an array of new ranges either side of the slice positions", () => {
      const r1 = new Range("id", 2, 8);
      const [r2, r3] = r1.slice(4, 6, 'new');
      expect(r2.from).toBe(2);
      expect(r2.to).toBe(4);
      expect(r3.from).toBe(6);
      expect(r3.to).toBe(8);
    });

    it("returns an array with one item in it when the slice takes out the whole of one side", () => {
      const r1 = new Range("id", 2, 8);
      const [r2, r3] = r1.slice(4, 8, 'new');
      expect(r2.from).toBe(2);
      expect(r2.to).toBe(4);
      expect(r3).toBe(undefined);
    });

    it("returns an array with no items when the slice takes out the whole range", () => {
      const r1 = new Range("id", 2, 8);
      const [r2, r3] = r1.slice(2, 8, 'new');
      expect(r2).toBe(undefined);
      expect(r3).toBe(undefined);
    });
  });

  describe("removeAfter", () => {
    it("truncates a range to before pos", () => {
      const r1 = new Range("id", 2, 8);
      const r2 = r1.removeAfter(6);
      expect(r2.from).toBe(2);
      expect(r2.to).toBe(6);
    });
  });

  describe("removeBefore", () => {
    it("truncates a range to after pos", () => {
      const r1 = new Range("id", 2, 8);
      const r2 = r1.removeBefore(6);
      expect(r2.from).toBe(6);
      expect(r2.to).toBe(8);
    });
  });

  describe("isEmpty", () => {
    it("is empty when from >= to", () => {
      const r1 = new Range("id", 0, -1);
      const r2 = new Range("id", 0, 0);
      const r3 = new Range("id", 0, 1);
      const r4 = new Range("id", 0, 2);
      expect(r1.isEmpty).toBe(true);
      expect(r2.isEmpty).toBe(true);
      expect(r3.isEmpty).toBe(false);
      expect(r4.isEmpty).toBe(false);
    });
  });
});
