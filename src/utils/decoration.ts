import { Decoration, DecorationSet } from "prosemirror-view";
import { RailSet } from "../rail-set";
import { Range } from "../range";
import { EditorState } from "prosemirror-state";

const createEndDeco = (
  pos: number,
  side: "start" | "end",
  type: string,
  id: string,
  cursor: number | null,
  bias: number,
  railIndex: number,
  isPlaceholder = false
) => {
  const span = document.createElement("span");
  span.classList.add("end", `end--${side}`, `end--${type}`);
  const sideBias = (side === "start" ? 1 : -1) * (isPlaceholder ? -0.1 : 1);
  return Decoration.widget(pos, span, {
    key: `${side}:${id}:${cursor === pos ? bias : ""}`,
    side: -bias + sideBias * (railIndex + 1),
    marks: []
  });
};

const createRangeDecos = (
  railNames: string[],
  railName: string,
  range: Range,
  rs: RailSet
) => [
  createEndDeco(
    range.from,
    "start",
    range.type,
    range.id,
    rs.cursor,
    rs.cursorBias,
    railNames.indexOf(railName)
  ),
  createEndDeco(
    range.to,
    "end",
    range.type,
    range.id,
    rs.cursor,
    rs.cursorBias,
    railNames.indexOf(railName)
  )
];

const createRailSetDecos = (rs: RailSet, state: EditorState) => {
  const railNames = Object.keys(rs.rails);
  const { placeholderSpec } = rs;
  return DecorationSet.create(state.doc, [
    ...Object.entries(rs.rails).reduce(
      (acc1, [railName, rail]) => [
        ...acc1,
        ...rail.ranges.reduce(
          (acc2, range) => [
            ...acc2,
            ...createRangeDecos(railNames, railName, range, rs)
          ],
          [] as Decoration[]
        )
      ],
      [] as Decoration[]
    ),
    ...(placeholderSpec
      ? createRangeDecos(railNames, placeholderSpec[0], placeholderSpec[1], rs)
      : [])
  ]);
};

export { createRailSetDecos };
