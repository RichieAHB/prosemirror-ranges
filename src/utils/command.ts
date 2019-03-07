import { EditorView } from "prosemirror-view";
import { EditorState } from "prosemirror-state";

// could create this when the plugin is created to make an accurate type for railName
const toggle = (railName: string, type: string) => (
  state: EditorState,
  dispatch: EditorView["dispatch"]
) => dispatch(state.tr.setMeta("TOGGLE", { railName, type }));

export { toggle };
