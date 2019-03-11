import { Decoration } from "prosemirror-view";
import { RailSet } from "../rail-set";
import { Range } from "../range";
import { namespaceClass as ns } from "./classes";

const createEndDeco = (
  pos: number,
  side: "start" | "end",
  type: string,
  id: string,
  cursor: number | null,
  bias: number,
  railName: string,
  railIndex: number,
  isPlaceholder: boolean
) => {
  const span = document.createElement("span");
  const prefix = ns("end");
  span.classList.add(prefix, `${prefix}--${side}`, `${prefix}--${type}`);
  span.dataset.rangeId = id;
  span.dataset.railName = railName;
  const sideBias = (side === "start" ? 1 : -1) * (isPlaceholder ? -0.1 : 1);
  return Decoration.widget(pos, span, {
    key: `${side}:${railName}:${id}:${cursor === pos ? bias : ""}`,
    side: -bias + sideBias * (railIndex + 1),
    marks: []
  });
};

const createRangeDecos = (
  railNames: string[],
  railName: string,
  range: Range,
  rs: RailSet,
  isPlaceholder = false
) => [
  createEndDeco(
    range.from,
    "start",
    range.type,
    range.id,
    rs.cursor,
    rs.cursorBias,
    railName,
    railNames.indexOf(railName),
    isPlaceholder
  ),
  createEndDeco(
    range.to,
    "end",
    range.type,
    range.id,
    rs.cursor,
    rs.cursorBias,
    railName,
    railNames.indexOf(railName),
    isPlaceholder
  )
];

const createRailSetEndDecos = (rs: RailSet) => {
  const railNames = Object.keys(rs.rails);
  const { placeholderSpec } = rs;
  return [
    ...rs.railSpecs.reduce(
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
      ? createRangeDecos(
          railNames,
          placeholderSpec[0],
          placeholderSpec[1],
          rs,
          true
        )
      : [])
  ];
};

const createCursorDeco = (pos: number, bias: number) => {
  const span = document.createElement("span");
  span.classList.add(ns("cursor"));
  return Decoration.widget(pos, span, {
    key: "cursor",
    side: bias,
    marks: []
  });
};

const createRailSetCursorDecos = (rs: RailSet) => {
  const boundaryPos = rs.cursorAtBoundary;
  return boundaryPos !== null
    ? [createCursorDeco(boundaryPos, rs.cursorBias * (rs.railSpecs.length + 1))]
    : [];
};

export { createRailSetEndDecos, createRailSetCursorDecos };
