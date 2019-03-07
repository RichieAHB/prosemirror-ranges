const { builders } = require("prosemirror-test-builder");
const { history } = require("prosemirror-history");
const { Schema, Fragment } = require("prosemirror-model");
const {
  EditorState,
  TextSelection,
  NodeSelection,
  Selection
} = require("prosemirror-state");
const { nodes, marks } = require("prosemirror-schema-basic");
const { TestState, removeTags } = require("./helpers/prosemirror");
const { addRangeMarks, ranges, toggle, sanitizeNode } = require("../index");
const { transformPasted } = require("../utils/transform-pasted");

const FLAG_MARK_NAME = "flag";
const FLAG_RAIL_NAME = "flag";

const NOTE_MARK_NAME = "note";
const NOTE_RAIL_NAME = "note";

const mySchema = new Schema({
  nodes,
  marks: addRangeMarks(marks, [
    {
      markName: FLAG_MARK_NAME,
      typeTagMap: {
        flag: "gu-flag",
        correct: "gu-correct"
      }
    },
    {
      markName: NOTE_MARK_NAME,
      typeTagMap: {
        note: "gu-note"
      }
    }
  ])
});

const build = builders(mySchema, {
  p: {
    markType: "paragraph"
  }
});

const { doc, p } = build;

const note = (attrs = {}, content) =>
  build.note(
    {
      type: "note",
      ...attrs
    },
    content
  );

const flag = (attrs = {}, content) =>
  build.flag(
    {
      type: "flag",
      ...attrs
    },
    content
  );

const t = (...content) => doc(...content);

const selFor = initDoc => {
  const { a } = initDoc.tag;
  if (a !== null) {
    const $a = initDoc.resolve(a);
    if ($a.parent.inlineContent) {
      const { b } = initDoc.tag;
      const $b = b ? initDoc.resolve(b) : undefined;
      return new TextSelection($a, $b);
    } else {
      return new NodeSelection($a);
    }
  }
  return Selection.atStart(doc);
};

const initPM = initDoc => {
  const historyPlugin = history();
  const state = EditorState.create({
    doc: initDoc,
    schema: mySchema,
    selection: selFor(initDoc),
    plugins: [
      historyPlugin,
      ranges(
        {
          [FLAG_RAIL_NAME]: mySchema.marks[FLAG_MARK_NAME],
          [NOTE_RAIL_NAME]: mySchema.marks[NOTE_MARK_NAME]
        },
        historyPlugin
      )
    ]
  });
  return new TestState(
    state,
    {
      toggleNote: toggle(NOTE_RAIL_NAME, "note"),
      toggleFlag: toggle(FLAG_RAIL_NAME, "flag")
    },
    transformPasted([
      mySchema.marks[FLAG_MARK_NAME],
      mySchema.marks[NOTE_MARK_NAME]
    ])
  );
};

let _id = 1;
const getGetID = () => {
  _id = 1;
  return () => _id++;
};

/* Runs through ids and normalizes them as they don't really matter */
const normalizeIds = (_node, idMap = {}, getID = getGetID()) => {
  const node = _node.copy(Fragment.from(_node.content)).mark(
    _node.marks.map(({ attrs, type }) => {
      idMap[attrs.id] = idMap[attrs.id] || getID();
      return type.create({ id: idMap[attrs.id], type: attrs.type });
    })
  );

  const children = [];

  node.content.forEach(_child => {
    const child = normalizeIds(_child, idMap, getID);
    children.push(child);
  });

  return node.copy(Fragment.from(children));
};

const testIO = (label, _input, steps, output, undoSteps = 1) => {
  const state = initPM(_input);
  const input = removeTags(_input);

  describe(label, () => {
    it("do", () => {
      steps(state);
      expect(normalizeIds(state.doc)).toEqual(output);
    });

    it("undo", () => {
      state.undo(undoSteps);
      expect(normalizeIds(state.doc)).toEqual(input);
    });

    it("redo", () => {
      state.redo(undoSteps);
      expect(normalizeIds(state.doc)).toEqual(output);
    });
  });
};

describe("Noter Plugin", () => {
  describe("toggle note", () => {
    testIO(
      "adds a note when at a cursor then typing",
      t(p("foo<a>")),
      s => s.runCommand("toggleNote").type("hi"),
      t(p("foo", note({ id: 1 }, "hi")))
    );

    testIO(
      "removes a note when at a cursor if toggled off before typing",
      t(p("foo<a>")),
      s =>
        s
          .runCommand("toggleNote")
          .runCommand("toggleNote")
          .type("hi"),
      t(p("foohi"))
    );

    testIO(
      "removes a note when cursor inside one",
      t(p("foo", note({ id: 1 }, "no<a>te"), "more")),
      s => s.runCommand("toggleNote"),
      t(p("foonotemore"))
    );

    testIO(
      "removes a note when cursor on the right edge of and inside one",
      t(p("foo", note({ id: 1 }, "note"), "<a>more")),
      s => s.left().runCommand("toggleNote"),
      t(p("foonotemore"))
    );

    testIO(
      "removes a note when cursor on the left edge of and inside one",
      t(p("foo<a>", note({ id: 1 }, "note"), "more")),
      s => s.right().runCommand("toggleNote"),
      t(p("foonotemore"))
    );

    testIO(
      "does note remove a note when cursor on the right edge and outside of one",
      t(p("foo", note({ id: 1 }, "note"), "<a>more")),
      s => s.runCommand("toggleNote"),
      t(p("foo", note({ id: 1 }, "note"), "more"))
    );

    testIO(
      "does note remove a note when cursor on the left edge and outside of one",
      t(p("foo<a>", note({ id: 1 }, "note"), "more")),
      s => s.runCommand("toggleNote"),
      t(p("foo", note({ id: 1 }, "note"), "more"))
    );

    testIO(
      "enlarges a note when selection outside one",
      t(p("f<a>oo", note({ id: 1 }, "note"), "mo<b>re")),
      s => s.runCommand("toggleNote"),
      t(p("f", note({ id: 1 }, "oonotemo"), "re"))
    );

    testIO(
      "slices a note when selection inside one",
      t(p("foo", note({ id: 1 }, "n<a>ot<b>e"), "more")),
      s => s.runCommand("toggleNote"),
      t(p("foo", note({ id: 1 }, "n"), "ot", note({ id: 2 }, "e"), "more"))
    );

    testIO(
      "slices a note when selection at the front and inside",
      t(p("foo", note({ id: 1 }, "<a>not<b>e"), "more")),
      s => s.runCommand("toggleNote"),
      t(p("foonot", note({ id: 1 }, "e"), "more"))
    );

    testIO(
      "slices a note when selection at the back and inside",
      t(p("foo", note({ id: 1 }, "n<a>ote<b>"), "more")),
      s => s.runCommand("toggleNote"),
      t(p("foo", note({ id: 1 }, "n"), "otemore"))
    );

    testIO(
      "deletes a note when covering one",
      t(p("foo", note({ id: 1 }, "<a>note<b>"), "more")),
      s => s.runCommand("toggleNote"),
      t(p("foonotemore"))
    );

    testIO(
      "merges multiple notes when covering them to the outside",
      t(
        p(
          "foo",
          note({ id: 1 }, "<a>note"),
          "bar",
          note({ id: 2 }, "note<b>"),
          "more"
        )
      ),
      s => s.runCommand("toggleNote"),
      t(p("foo", note({ id: 1 }, "notebarnote"), "more"))
    );

    testIO(
      "merges multiple notes when covering them to the inside",
      t(
        p(
          "foo",
          note({ id: 1 }, "not<a>e"),
          "bar",
          note({ id: 2 }, "n<b>ote"),
          "more"
        )
      ),
      s => s.runCommand("toggleNote"),
      t(p("foo", note({ id: 1 }, "notebarnote"), "more"))
    );

    testIO(
      "does not merge notes of different types when they touch",
      t(
        p(
          "foo",
          note({ id: 1 }, "not<a>eA"),
          note({ id: 2, type: "flag" }, "no<b>teB"),
          "bar"
        )
      ),
      s => s.runCommand("toggleNote"),
      t(
        p(
          "foo",
          note({ id: 1 }, "noteAno"),
          note({ id: 2, type: "flag" }, "teB"),
          "bar"
        )
      )
    );
  });

  testIO(
    "stays inside notes with newlines",
    t(p("foo", note({ id: 1 }, "no<a>te"), "more")),
    s =>
      s
        .enter(2)
        .left()
        .type("hello"),
    t(
      p("foo", note({ id: 1 }, "no")),
      p(note({ id: 1 }, "hello")),
      p(note({ id: 1 }, "te"), "more")
    )
  );

  testIO(
    "does extend note at beginning when inside",
    t(p("foo", note({ id: 1 }, "no<a>te"), "more")),
    s => s.left(2).type("bar"),
    t(p("foo", note({ id: 1 }, "barnote"), "more"))
  );

  testIO(
    "doesn't extend note at beginning when outside",
    t(p("foo", note({ id: 1 }, "no<a>te"), "more")),
    s => s.left(3).type("bar"),
    t(p("foobar", note({ id: 1 }, "note"), "more"))
  );

  testIO(
    "does extend note at the end when inside",
    t(p("foo", note({ id: 1 }, "no<a>te"), "more")),
    s => s.right(2).type("bar"),
    t(p("foo", note({ id: 1 }, "notebar"), "more"))
  );

  testIO(
    "doesn't extend note at the end when outside",
    t(p("foo", note({ id: 1 }, "no<a>te"), "more")),
    s => s.right(3).type("bar"),
    t(p("foo", note({ id: 1 }, "note"), "barmore"))
  );

  testIO(
    "can handle pasting into a note",
    t(p("<a>foo<b>", note({ id: 1 }, "note"), "more")),
    s =>
      s
        .cut()
        .right(2)
        .paste(),
    t(p(note({ id: 1 }, "nfooote"), "more")),
    2
  );

  testIO(
    "can handle cutting and pasting a split note after it",
    t(p("foo", note({ id: 1 }, "no<a>te"), "mo<b>re")),
    s =>
      s
        .cut()
        .right()
        .paste(2),
    t(
      p(
        "foo",
        note({ id: 1 }, "no"),
        "r",
        note({ id: 2 }, "te"),
        "mo",
        note({ id: 3 }, "te"),
        "mo",
        "e"
      )
    ),
    3
  );

  testIO(
    "can handle copying and pasting a split note after it",
    t(p("afoo", note({ id: 1 }, "no<a>te"), "mo<b>re")),
    s =>
      s
        .copy()
        .right(5)
        .paste(2),
    t(
      p(
        "afoo",
        note({ id: 1 }, "note"),
        "mo",
        note({ id: 2 }, "te"),
        "mo",
        note({ id: 3 }, "te"),
        "more"
      )
    ),
    3
  );

  testIO(
    "can handle cutting and pasting a split note before it",
    t(p("test", note({ id: 1 }, "no<a>te"), "te<b>st")),
    s =>
      s
        .cut()
        .left(6)
        .paste(),
    t(p("te", note({ id: 1 }, "te"), "test", note({ id: 2 }, "no"), "st")),
    3
  );

  testIO(
    "can handle pasting a note into a note",
    t(
      p(
        "<a>f",
        note({ id: 1 }, "o"),
        "o",
        note({ id: 2 }, "o"),
        "o<b>",
        note({ id: 3 }, "note"),
        "more"
      )
    ),
    s =>
      s
        .cut()
        .right(2)
        .paste(),
    t(p(note({ id: 1 }, "nfooooote"), "more")),
    2
  );

  testIO(
    "can handle pasting notes of different types into a note",
    t(
      p(
        "<a>f",
        note({ id: 1 }, "o"),
        "o",
        note({ id: 2, type: "flag" }, "o"),
        "o<b>",
        note({ id: 3 }, "note"),
        "more"
      )
    ),
    s =>
      s
        .cut()
        .right(2)
        .paste(),
    t(
      p(
        note({ id: 1 }, "nfoo"),
        note({ id: 2, type: "flag" }, "o"),
        note({ id: 3 }, "oote"),
        "more"
      )
    ),
    2
  );

  testIO(
    "can handle pasting notes into selections that abut different types of note",
    t(
      p(
        note({ id: 1 }, "<a>foo<b>"),
        "o",
        note({ id: 2, type: "flag" }, "bar"),
        "o",
        note({ id: 3 }, "baz"),
        "more"
      )
    ),
    s =>
      s
        .cut()
        // An additional step right to move us inside the note,
        // and then one character forward
        .right(3)
        .selectRight(4)
        .paste(),
    t(
      p(
        "o",
        note({ id: 1, type: "flag" }, "b"),
        note({ id: 2 }, "fooaz"),
        "more"
      )
    ),
    2
  );

  testIO(
    "can handle pasting notes of different types",
    t(p(note({ id: 1, type: "flag" }, "<a>bar<b>"))),
    s => s.cut().paste(),
    t(p(note({ id: 1, type: "flag" }, "bar")))
  );

  // TODO: This should be moved into a `TestState` tester

  testIO(
    "TestState selects right properly",
    t(p("m<a>o<b>remore")),
    s =>
      s
        .cut()
        .right(1)
        .selectRight(4)
        .paste(),
    t(p("mroe")),
    2
  );

  describe("Backspace", () => {
    testIO(
      "can handle backspacing from ahead",
      t(p("foo", note({ id: 1 }, "bar"), "m<a>ore")),
      s => s.backspace(2),
      t(p("foo", note({ id: 1 }, "ba"), "ore"))
    );

    testIO(
      "can handle backspacing from inside",
      t(p("foo", note({ id: 1 }, "b<a>ar"), "more")),
      s => s.backspace(2),
      t(p("fo", note({ id: 1 }, "ar"), "more"))
    );

    testIO(
      "can handle backspacing from behind",
      t(p("foo", note({ id: 1 }, "<a>bar"), "more")),
      s => s.backspace(2),
      t(p("f", note({ id: 1 }, "bar"), "more"))
    );
  });

  describe("Delete", () => {
    testIO(
      "can handle deleting from ahead",
      t(p("foo", note({ id: 1 }, "bar<a>"), "more")),
      s => s.delete(2),
      t(p("foo", note({ id: 1 }, "bar"), "re"))
    );

    testIO(
      "can handle deleting from inside",
      t(p("foo", note({ id: 1 }, "b<a>ar"), "more")),
      s => s.delete(3),
      t(p("foo", note({ id: 1 }, "b"), "ore"))
    );

    testIO(
      "can handle deleting from behind",
      t(p("foo", note({ id: 1 }, "<a>bar"), "more")),
      s => s.delete(2),
      t(p("foo", note({ id: 1 }, "r"), "more"))
    );
  });

  describe("sanitizeNode", () => {
    const getID = () => {
      let id = 10;
      return () => {
        return id++;
      };
    };

    it("gets correct notes from a document", () => {
      const input = t(
        p("f", note({ id: 1 }, "a"), "g", note({ id: 2 }, "b")),
        p(
          note({ id: 2 }, "c"),
          "h",
          note({ id: 1 }, "d"),
          "i",
          note({ id: 1 }, "e")
        )
      );
      const output = t(
        p("f", note({ id: 1 }, "a"), "g", note({ id: 2 }, "b")),
        p(
          note({ id: 2 }, "c"),
          "h",
          note({ id: 10 }, "d"),
          "i",
          note({ id: 11 }, "e")
        )
      );
      expect(
        sanitizeNode(input, [mySchema.marks.note], false, getID())
      ).toEqual(output);
    });

    it("accepts multiple note types", () => {
      const input = t(
        p("f", note({ id: 1 }, "a"), "g", flag({ id: 1 }, "b")),
        p(
          flag({ id: 1 }, "c"),
          "h",
          note({ id: 1 }, "d"),
          "i",
          flag({ id: 1 }, "e")
        )
      );
      const output = t(
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
          [mySchema.marks.note, mySchema.marks.flag],
          false,
          getID()
        )
      ).toEqual(output);
    });
  });
});
