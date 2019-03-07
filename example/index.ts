import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema, DOMParser } from "prosemirror-model";
import { schema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";
import { exampleSetup } from "prosemirror-example-setup";
import { history } from "prosemirror-history";
import OrderedMap from "orderedmap";
import { ranges, toggle, addRangeMarks } from "../src/index";

const FLAG_MARK_NAME = "flag";
const FLAG_RAIL_NAME = "flag";

const NOTE_MARK_NAME = "note";
const NOTE_RAIL_NAME = "note";

// Mix the nodes from prosemirror-schema-list into the basic schema to
// create a schema with list support.
const mySchema = new Schema({
  nodes: addListNodes(
    OrderedMap.from(schema.spec.nodes || {}),
    "paragraph block*",
    "block"
  ),
  marks: addRangeMarks(schema.spec.marks, [
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

const editor = document.querySelector("#editor");
const content = document.querySelector("#content");

const historyPlugin = history();

if (editor && content) {
  const view = new EditorView(editor, {
    state: EditorState.create({
      doc: DOMParser.fromSchema(mySchema).parse(content),
      plugins: [
        ...exampleSetup({ schema: mySchema, history: false }),
        historyPlugin,
        ranges(
          {
            [FLAG_RAIL_NAME]: mySchema.marks[FLAG_MARK_NAME],
            [NOTE_RAIL_NAME]: mySchema.marks[NOTE_MARK_NAME]
          },
          historyPlugin
        )
      ]
    })
  });

  window.addEventListener("keydown", e => {
    switch (e.keyCode) {
      case 118: {
        toggle(FLAG_RAIL_NAME, "flag")(view.state, view.dispatch);
        break;
      }
      case 119: {
        toggle(FLAG_RAIL_NAME, "correct")(view.state, view.dispatch);
        break;
      }
      case 121: {
        toggle(NOTE_RAIL_NAME, "note")(view.state, view.dispatch);
        break;
      }
    }
  });
}
