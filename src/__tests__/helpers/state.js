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
const { TestState } = require("./test-state");
const { addRangeMarks, ranges, toggle } = require("../../index");
const { transformPasted } = require("../../utils/transform-pasted");

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

const createTestState = initDoc => {
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

const removeTags = _node => {
  const node = _node.copy(_node.content);
  delete node.tag;
  const children = [];
  for (let i = 0; i < node.content.childCount; i += 1) {
    const child = node.content.child(i);
    children.push(removeTags(child));
  }
  return node.copy(Fragment.from(children));
};

module.exports = {
  createTestState,
  removeTags,
  doc,
  p,
  note,
  flag,
  schema: mySchema
};
