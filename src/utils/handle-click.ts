import { Range } from "../range";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

type ClickHandler = (
  event: MouseEvent,
  range: Range,
  state: EditorState,
  dispatch: EditorView["dispatch"]
) => void;

const handleClick = (
  getRangeByRailNameAndId: (railName: string, id: string) => Range | null,
  handleClick: ClickHandler,
  { dispatch, state }: EditorView,
  e: MouseEvent
): boolean => {
  const { target } = e;

  if (!target) {
    return false;
  }

  const { rangeId, railName } = (target as HTMLElement).dataset;

  if (!rangeId || !railName) {
    return false;
  }

  const range = getRangeByRailNameAndId(railName, rangeId);

  if (!range) {
    return false;
  }

  handleClick(e, range, state, dispatch);

  return true;
};

export { handleClick, ClickHandler };
