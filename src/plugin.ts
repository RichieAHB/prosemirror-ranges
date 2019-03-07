import { Plugin, TextSelection, AllSelection } from "prosemirror-state";
import { DecorationSet, Decoration } from "prosemirror-view";
import { MarkType } from "prosemirror-model";
import { RailSet } from "./rail-set";
import { createEndDeco } from "./utils/decoration";
import { transformPasted } from "./utils/transform-pasted";

type State = RailSet;

const ranges = (
  markTypes: { [railName: string]: MarkType },
  historyPlugin: Plugin,
  getId?: () => string
) =>
  new Plugin<State>({
    state: {
      init: (_, state) => RailSet.fromDoc(markTypes, state.doc, getId),
      apply: (tr, rs, oldState, newState) => {
        if (tr.getMeta(historyPlugin) || tr.getMeta("paste")) {
          return RailSet.fromDoc(markTypes, newState.doc);
        }

        const rs2 = rs
          .map(tr.mapping.map.bind(tr.mapping))
          .updateSelection(newState.selection.from, newState.selection.to);
        const toggle = tr.getMeta("TOGGLE");
        return toggle ? rs2.toggle(toggle.railName, toggle.type) : rs2;
      }
    },
    appendTransaction: function(this: Plugin<State>, trs, oldState, newState) {
      const rs = this.getState(newState);
      const { cursor } = rs;
      const { tr } = newState;

      if (
        !trs.some(tr => tr.getMeta(historyPlugin)) &&
        !trs.some(tr => tr.getMeta("paste")) &&
        cursor !== null &&
        cursor !== newState.selection.from
      ) {
        tr.setSelection(TextSelection.near(newState.doc.resolve(cursor)));
      }

      // Currently there is 0 diffing but it probably wouldn't be too hard
      // using Range#eq and the prev range
      if (trs.some(tr => tr.docChanged || tr.getMeta("TOGGLE"))) {
        const { from, to } = new AllSelection(newState.doc);
        Object.entries(rs.rails).forEach(([railName, rail]) => {
          const markType = markTypes[railName];
          tr.removeMark(from, to, markType);
          rail.ranges.forEach(range => {
            tr.addMark(
              range.from,
              range.to,
              markType.create({ id: range.id, type: range.type })
            );
          });
        });
      }

      if (tr.docChanged || tr.selectionSet) {
        return tr;
      }
    },
    props: {
      transformPasted: transformPasted(Object.values(markTypes)),
      decorations: function(this: Plugin<State>, state) {
        const rs = this.getState(state);
        return DecorationSet.create(
          state.doc,
          rs.ranges.reduce(
            (acc, { from, to, id, type }) => [
              ...acc,
              createEndDeco(from, "start", type, id, rs.cursor, rs.cursorBias),
              createEndDeco(to, "end", type, id, rs.cursor, rs.cursorBias)
            ],
            [] as Decoration[]
          )
        );
      }
    }
  });

export { ranges };
