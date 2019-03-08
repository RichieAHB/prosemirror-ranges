import { Plugin } from "prosemirror-state";
import { RailSet, RailMarkTypeMap } from "./rail-set";
import {
  createRailSetEndDecos,
  createRailSetCursorDecos
} from "./utils/decoration";
import { transformPasted } from "./utils/transform-pasted";
import { maybeAppendTransaction } from "./utils/transaction";
import { DecorationSet } from "prosemirror-view";

type State = RailSet;

// TODO: allow generics for railName, meta (once added) etc.
const ranges = (
  markTypes: RailMarkTypeMap,
  historyPlugin: Plugin,
  getId?: () => string
) =>
  new Plugin<State>({
    state: {
      init: (_, state) => RailSet.fromDoc(markTypes, state.doc, getId),
      apply: (tr, rs) =>
        rs.handleUpdate(
          (tr.getMeta(historyPlugin) || tr.getMeta("paste")) && {
            markTypes,
            doc: tr.doc
          },
          tr.mapping.map.bind(tr.mapping),
          tr.selection.from,
          tr.selection.to,
          tr.getMeta("TOGGLE")
        )
    },
    appendTransaction: function(this: Plugin<State>, trs, oldState, newState) {
      return maybeAppendTransaction(
        markTypes,
        this.getState(newState),
        trs,
        newState,
        historyPlugin
      );
    },
    props: {
      transformPasted: transformPasted(Object.values(markTypes)),
      attributes: function(
        this: Plugin<State>,
        state
      ): { [attr: string]: string } {
        const rs = this.getState(state);
        return rs.cursorAtBoundary !== null ? { class: "hide-selection" } : {};
      },
      decorations: function(this: Plugin<State>, state) {
        const rs = this.getState(state);
        return DecorationSet.create(state.doc, [
          ...createRailSetEndDecos(rs),
          ...createRailSetCursorDecos(rs)
        ]);
      }
    }
  });

export { ranges };
