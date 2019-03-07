import { Slice, MarkType } from "prosemirror-model";
import { sanitizeFragment } from "./state";

const transformPasted = (markTypes: MarkType[]) => ({
  content,
  openStart,
  openEnd
}: Slice) =>
  new Slice(
    sanitizeFragment(content, Object.values(markTypes), true),
    openStart,
    openEnd
  );

export { transformPasted };
