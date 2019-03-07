import OrderedMap from "orderedmap";
import { Schema, Mark, MarkSpec } from "prosemirror-model";

type RangeMarkSpec = {
  markName: string;
  typeTagMap: { [type: string]: string };
};

const addRangeMark = (
  marks: OrderedMap<MarkSpec>,
  { markName, typeTagMap }: RangeMarkSpec
) =>
  marks.append({
    [markName]: {
      attrs: {
        id: {},
        type: {}
      },
      parseDOM: Object.entries(typeTagMap).map(([type, tag]) => ({
        tag,
        getAttrs: (node: any) => {
          const el: HTMLElement = node;
          const { id } = el.dataset;
          return { id, type };
        }
      })),
      toDOM: (mark: Mark<Schema>) =>
        [
          typeTagMap[mark.attrs.type],
          {
            "data-id": mark.attrs.id,
            class: "range"
          }
        ] as [string, { [attr: string]: string }]
    }
  });

const addRangeMarks = (
  marks: Schema["spec"]["marks"],
  rangeMarkSpecs: RangeMarkSpec[]
) =>
  rangeMarkSpecs.reduce(
    (marks, rangeMarkSpec) => addRangeMark(marks, rangeMarkSpec),
    OrderedMap.from(marks || {})
  );

export { addRangeMarks };
