import {
  Plugin,
  TextSelection,
  AllSelection,
  Transaction,
  EditorState,
  PluginKey
} from "prosemirror-state";
import { RailMarkTypeMap, RailSet } from "../rail-set";
import { TOGGLE_KEY } from "./command";

const transactionShouldSetSelection = (
  cursor: number,
  trs: Transaction[],
  state: EditorState,
  historyPlugin: Plugin | PluginKey
) =>
  !trs.some(tr => tr.getMeta(historyPlugin) || tr.getMeta("paste")) &&
  cursor !== state.selection.from;

const transactionShouldRebuildMarks = (trs: Transaction[]) =>
  trs.some(tr => tr.docChanged || tr.getMeta(TOGGLE_KEY));

// Currently there is zero diffing but it probably wouldn't be too hard
// using Range#eq and the prev range
const rebuildRailMarks = (
  markTypes: RailMarkTypeMap,
  tr: Transaction,
  rs: RailSet
) => {
  const { from, to } = new AllSelection(tr.doc);
  rs.railSpecs.forEach(([railName, rail]) => {
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
};

const maybeAppendTransaction = (
  markTypes: RailMarkTypeMap,
  rs: RailSet,
  trs: Transaction[],
  newState: EditorState,
  historyPlugin: Plugin | PluginKey
) => {
  const { cursor } = rs;
  const { tr } = newState;
  if (
    cursor &&
    transactionShouldSetSelection(cursor, trs, newState, historyPlugin)
  ) {
    tr.setSelection(TextSelection.near(newState.doc.resolve(cursor)));
  }

  if (transactionShouldRebuildMarks(trs)) {
    rebuildRailMarks(markTypes, tr, rs);
  }

  if (tr.docChanged || tr.selectionSet) {
    return tr;
  }
};

export { maybeAppendTransaction };
