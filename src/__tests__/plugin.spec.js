const {
  createTestState,
  removeTags,
  doc,
  p,
  note,
  flag
} = require("./helpers/state");
const { normalizeIds } = require("./helpers/marks");

const testDoUndoRedo = (inputWithDoc, steps, output, undoSteps = 1) => {
  const state = createTestState(inputWithDoc);
  const input = removeTags(inputWithDoc);

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
};

describe("Noter Plugin", () => {
  describe("toggle note", () => {
    describe("adds a note when at a cursor then typing", () =>
      testDoUndoRedo(
        doc(p("foo<a>")),
        s => s.runCommand("toggleNote").type("hi"),
        doc(p("foo", note({ id: 1 }, "hi")))
      ));

    describe("removes a note when at a cursor if toggled off before typing", () =>
      testDoUndoRedo(
        doc(p("foo<a>")),
        s =>
          s
            .runCommand("toggleNote")
            .runCommand("toggleNote")
            .type("hi"),
        doc(p("foohi"))
      ));

    describe("adds a note when at a cursor then typing just after another rail", () =>
      testDoUndoRedo(
        doc(p("foo", flag({ id: 1 }, "no<a>te"), "more")),
        s =>
          s
            .right(3)
            .runCommand("toggleNote")
            .type("hi"),
        doc(p("foo", flag({ id: 1 }, "note"), note({ id: 2 }, "hi"), "more"))
      ));

    describe("removes a note when cursor inside one", () =>
      testDoUndoRedo(
        doc(p("foo", note({ id: 1 }, "no<a>te"), "more")),
        s => s.runCommand("toggleNote"),
        doc(p("foonotemore"))
      ));

    describe("removes a note when cursor on the right edge of and inside one", () =>
      testDoUndoRedo(
        doc(p("foo", note({ id: 1 }, "note"), "<a>more")),
        s => s.left().runCommand("toggleNote"),
        doc(p("foonotemore"))
      ));

    describe("removes a note when cursor on the left edge of and inside one", () =>
      testDoUndoRedo(
        doc(p("foo<a>", note({ id: 1 }, "note"), "more")),
        s => s.right().runCommand("toggleNote"),
        doc(p("foonotemore"))
      ));

    describe("does note remove a note when cursor on the right edge and outside of one", () =>
      testDoUndoRedo(
        doc(p("foo", note({ id: 1 }, "note"), "<a>more")),
        s => s.runCommand("toggleNote"),
        doc(p("foo", note({ id: 1 }, "note"), "more"))
      ));

    describe("does note remove a note when cursor on the left edge and outside of one", () =>
      testDoUndoRedo(
        doc(p("foo<a>", note({ id: 1 }, "note"), "more")),
        s => s.runCommand("toggleNote"),
        doc(p("foo", note({ id: 1 }, "note"), "more"))
      ));

    describe("enlarges a note when selection outside one", () =>
      testDoUndoRedo(
        doc(p("f<a>oo", note({ id: 1 }, "note"), "mo<b>re")),
        s => s.runCommand("toggleNote"),
        doc(p("f", note({ id: 1 }, "oonotemo"), "re"))
      ));

    describe("slices a note when selection inside one", () =>
      testDoUndoRedo(
        doc(p("foo", note({ id: 1 }, "n<a>ot<b>e"), "more")),
        s => s.runCommand("toggleNote"),
        doc(p("foo", note({ id: 1 }, "n"), "ot", note({ id: 2 }, "e"), "more"))
      ));

    describe("slices a note when selection at the front and inside", () =>
      testDoUndoRedo(
        doc(p("foo", note({ id: 1 }, "<a>not<b>e"), "more")),
        s => s.runCommand("toggleNote"),
        doc(p("foonot", note({ id: 1 }, "e"), "more"))
      ));

    describe("slices a note when selection at the back and inside", () =>
      testDoUndoRedo(
        doc(p("foo", note({ id: 1 }, "n<a>ote<b>"), "more")),
        s => s.runCommand("toggleNote"),
        doc(p("foo", note({ id: 1 }, "n"), "otemore"))
      ));

    describe("deletes a note when covering one", () =>
      testDoUndoRedo(
        doc(p("foo", note({ id: 1 }, "<a>note<b>"), "more")),
        s => s.runCommand("toggleNote"),
        doc(p("foonotemore"))
      ));

    describe("merges multiple notes when covering them to the outside", () =>
      testDoUndoRedo(
        doc(
          p(
            "foo",
            note({ id: 1 }, "<a>note"),
            "bar",
            note({ id: 2 }, "note<b>"),
            "more"
          )
        ),
        s => s.runCommand("toggleNote"),
        doc(p("foo", note({ id: 1 }, "notebarnote"), "more"))
      ));

    describe("merges multiple notes when covering them to the inside", () =>
      testDoUndoRedo(
        doc(
          p(
            "foo",
            note({ id: 1 }, "not<a>e"),
            "bar",
            note({ id: 2 }, "n<b>ote"),
            "more"
          )
        ),
        s => s.runCommand("toggleNote"),
        doc(p("foo", note({ id: 1 }, "notebarnote"), "more"))
      ));

    describe("does not merge notes of different types when they touch", () =>
      testDoUndoRedo(
        doc(
          p(
            "foo",
            note({ id: 1 }, "not<a>eA"),
            note({ id: 2, type: "flag" }, "no<b>teB"),
            "bar"
          )
        ),
        s => s.runCommand("toggleNote"),
        doc(
          p(
            "foo",
            note({ id: 1 }, "noteAno"),
            note({ id: 2, type: "flag" }, "teB"),
            "bar"
          )
        )
      ));
  });

  describe("stays inside notes with newlines", () =>
    testDoUndoRedo(
      doc(p("foo", note({ id: 1 }, "no<a>te"), "more")),
      s =>
        s
          .enter(2)
          .left()
          .type("hello"),
      doc(
        p("foo", note({ id: 1 }, "no")),
        p(note({ id: 1 }, "hello")),
        p(note({ id: 1 }, "te"), "more")
      )
    ));

  describe("does extend note at beginning when inside", () =>
    testDoUndoRedo(
      doc(p("foo", note({ id: 1 }, "no<a>te"), "more")),
      s => s.left(2).type("bar"),
      doc(p("foo", note({ id: 1 }, "barnote"), "more"))
    ));

  describe("doesn't extend note at beginning when outside", () =>
    testDoUndoRedo(
      doc(p("foo", note({ id: 1 }, "no<a>te"), "more")),
      s => s.left(3).type("bar"),
      doc(p("foobar", note({ id: 1 }, "note"), "more"))
    ));

  describe("does extend note at the end when inside", () =>
    testDoUndoRedo(
      doc(p("foo", note({ id: 1 }, "no<a>te"), "more")),
      s => s.right(2).type("bar"),
      doc(p("foo", note({ id: 1 }, "notebar"), "more"))
    ));

  describe("doesn't extend note at the end when outside", () =>
    testDoUndoRedo(
      doc(p("foo", note({ id: 1 }, "no<a>te"), "more")),
      s => s.right(3).type("bar"),
      doc(p("foo", note({ id: 1 }, "note"), "barmore"))
    ));

  describe("has a position between two adjacent notes with different types", () =>
    testDoUndoRedo(
      doc(
        p(
          "foo",
          note({ id: 1 }, "no<a>te"),
          note({ id: 2, type: "another" }, "note"),
          "more"
        )
      ),
      s => s.right(3).type("bar"),
      doc(
        p(
          "foo",
          note({ id: 1 }, "note"),
          "bar",
          note({ id: 2, type: "another" }, "note"),
          "more"
        )
      )
    ));

  // TODO: fix this test - maybe find an heuristic
  // describe(
  //   "doesn't extend note at the end when outside at the end of a document", () => testIO(
  //   t(p("foo", note({ id: 1 }, "no<a>te"))),
  //   s => s.right(3).type("bar"),
  //   t(p("foo", note({ id: 1 }, "note"), "bar"))
  // );

  describe("can handle pasting into a note", () =>
    testDoUndoRedo(
      doc(p("<a>foo<b>", note({ id: 1 }, "note"), "more")),
      s =>
        s
          .cut()
          .right(2)
          .paste(),
      doc(p(note({ id: 1 }, "nfooote"), "more")),
      2
    ));

  describe("can handle cutting and pasting a split note after it", () =>
    testDoUndoRedo(
      doc(p("foo", note({ id: 1 }, "no<a>te"), "mo<b>re")),
      s =>
        s
          .cut()
          .right()
          .paste(2),
      doc(
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
    ));

  describe("can handle copying and pasting a split note after it", () =>
    testDoUndoRedo(
      doc(p("afoo", note({ id: 1 }, "no<a>te"), "mo<b>re")),
      s =>
        s
          .copy()
          .right(5)
          .paste(2),
      doc(
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
    ));

  describe("can handle cutting and pasting a split note before it", () =>
    testDoUndoRedo(
      doc(p("test", note({ id: 1 }, "no<a>te"), "te<b>st")),
      s =>
        s
          .cut()
          .left(6)
          .paste(),
      doc(p("te", note({ id: 1 }, "te"), "test", note({ id: 2 }, "no"), "st")),
      3
    ));

  describe("can handle pasting a note into a note", () =>
    testDoUndoRedo(
      doc(
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
      doc(p(note({ id: 1 }, "nfooooote"), "more")),
      2
    ));

  describe("can handle pasting notes of different types into a note", () =>
    testDoUndoRedo(
      doc(
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
      doc(
        p(
          note({ id: 1 }, "nfoo"),
          note({ id: 2, type: "flag" }, "o"),
          note({ id: 3 }, "oote"),
          "more"
        )
      ),
      2
    ));

  describe("can handle pasting notes into selections that abut different types of note", () =>
    testDoUndoRedo(
      doc(
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
      doc(
        p(
          "o",
          note({ id: 1, type: "flag" }, "b"),
          note({ id: 2 }, "fooaz"),
          "more"
        )
      ),
      2
    ));

  describe("can handle pasting notes of different types", () =>
    testDoUndoRedo(
      doc(p(note({ id: 1, type: "flag" }, "<a>bar<b>"))),
      s => s.cut().paste(),
      doc(p(note({ id: 1, type: "flag" }, "bar")))
    ));

  // TODO: This should be moved into a `TestState` tester

  describe("TestState selects right properly", () =>
    testDoUndoRedo(
      doc(p("m<a>o<b>remore")),
      s =>
        s
          .cut()
          .right(1)
          .selectRight(4)
          .paste(),
      doc(p("mroe")),
      2
    ));

  describe("Backspace", () => {
    describe("can handle backspacing from ahead", () =>
      testDoUndoRedo(
        doc(p("foo", note({ id: 1 }, "bar"), "m<a>ore")),
        s => s.backspace(2),
        doc(p("foo", note({ id: 1 }, "ba"), "ore"))
      ));

    describe("can handle backspacing from inside", () =>
      testDoUndoRedo(
        doc(p("foo", note({ id: 1 }, "ba<a>r"), "more")),
        s => s.backspace(3),
        doc(p("fo", note({ id: 1 }, "r"), "more"))
      ));

    describe("can handle backspacing from behind", () =>
      testDoUndoRedo(
        doc(p("foo", note({ id: 1 }, "<a>bar"), "more")),
        s => s.backspace(2),
        doc(p("f", note({ id: 1 }, "bar"), "more"))
      ));
  });

  describe("Delete", () => {
    describe("can handle deleting from ahead", () =>
      testDoUndoRedo(
        doc(p("foo", note({ id: 1 }, "bar<a>"), "more")),
        s => s.delete(2),
        doc(p("foo", note({ id: 1 }, "bar"), "re"))
      ));

    describe("can handle deleting from inside", () =>
      testDoUndoRedo(
        doc(p("foo", note({ id: 1 }, "b<a>ar"), "more")),
        s => s.delete(3),
        doc(p("foo", note({ id: 1 }, "b"), "ore"))
      ));

    describe("can handle deleting from behind", () =>
      testDoUndoRedo(
        doc(p("foo", note({ id: 1 }, "<a>bar"), "more")),
        s => s.delete(2),
        doc(p("foo", note({ id: 1 }, "r"), "more"))
      ));
  });
});
