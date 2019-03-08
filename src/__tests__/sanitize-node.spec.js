const { sanitizeNode } = require("../utils/state");
const { doc, p, note, flag, schema } = require("./helpers/state");

describe("sanitizeNode", () => {
  const getID = () => {
    let id = 10;
    return () => {
      return id++;
    };
  };

  it("gets correct notes from a document", () => {
    const input = doc(
      p("f", note({ id: 1 }, "a"), "g", note({ id: 2 }, "b")),
      p(
        note({ id: 2 }, "c"),
        "h",
        note({ id: 1 }, "d"),
        "i",
        note({ id: 1 }, "e")
      )
    );
    const output = doc(
      p("f", note({ id: 1 }, "a"), "g", note({ id: 2 }, "b")),
      p(
        note({ id: 2 }, "c"),
        "h",
        note({ id: 10 }, "d"),
        "i",
        note({ id: 11 }, "e")
      )
    );
    expect(sanitizeNode(input, [schema.marks.note], false, getID())).toEqual(
      output
    );
  });

  it("accepts multiple note types", () => {
    const input = doc(
      p("f", note({ id: 1 }, "a"), "g", flag({ id: 1 }, "b")),
      p(
        flag({ id: 1 }, "c"),
        "h",
        note({ id: 1 }, "d"),
        "i",
        flag({ id: 1 }, "e")
      )
    );
    const output = doc(
      p("f", note({ id: 1 }, "a"), "g", flag({ id: 1 }, "b")),
      p(
        flag({ id: 1 }, "c"),
        "h",
        note({ id: 10 }, "d"),
        "i",
        flag({ id: 11 }, "e")
      )
    );
    expect(
      sanitizeNode(
        input,
        [schema.marks.note, schema.marks.flag],
        false,
        getID()
      )
    ).toEqual(output);
  });
});
