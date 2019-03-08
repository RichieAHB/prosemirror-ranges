import { Plugin } from "prosemirror-state";
import { RailSet, RailMarkTypeMap } from "./rail-set";
import { createRailSetDecos } from "./utils/decoration";
import { transformPasted } from "./utils/transform-pasted";
import { maybeAppendTransaction } from "./utils/transaction";

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
      decorations: function(this: Plugin<State>, state) {
        return createRailSetDecos(this.getState(state), state);
      }
    }
  });

export { ranges };
