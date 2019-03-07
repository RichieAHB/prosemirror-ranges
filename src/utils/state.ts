import { AllSelection, Transaction } from "prosemirror-state";
import { Node, MarkType, Mark, Fragment } from "prosemirror-model";
import v4 from "uuid/v4";

type RangeSpec = {
  id: string;
  type: string; // could genericise this
  nodes: { from: number; to: number }[];
  from: number;
  to: number;
};

const readRangesFromDoc = (
  doc: Node,
  markType: MarkType,
  min?: number,
  max?: number
): RangeSpec[] => {
  const ranges: { [id: string]: RangeSpec } = {};

  const { from, to } = new AllSelection(doc);

  const _min = typeof min === "undefined" ? from : min;
  const _max = typeof max === "undefined" ? to : max;

  doc.nodesBetween(_min, _max, (node, from) => {
    const to = from + node.nodeSize;
    const mark = markType.isInSet(node.marks);

    if (mark) {
      const { id, type } = mark.attrs;

      ranges[id] = ranges[id] || {
        id,
        type, // this should be the same across all ranges so just set it here
        nodes: [],
        from: Infinity,
        to: -Infinity
      };

      ranges[id] = {
        ...ranges[id],
        from: Math.min(ranges[id].from, from),
        to: Math.max(ranges[id].to, to),
        nodes: [
          ...ranges[id].nodes,
          {
            from,
            to
          }
        ]
      };
    }
  });

  return Object.values(ranges);
};

// Runs through a Fragment's nodes and runs `updater` on them,
// which is expected to return a node - either the same one or a modified one -
// which is then added in place of the old node
const updateFragmentNodes = (updater: (node: Node) => Node) => (
  prevFrag: Fragment
) => {
  let frag = Fragment.empty;

  const appendNodeToFragment = (node: Node) =>
    (frag = frag.append(Fragment.from(node)));

  prevFrag.forEach(node => {
    const newNode = updater(node);
    appendNodeToFragment(
      newNode.copy(updateFragmentNodes(updater)(newNode.content))
    );
  });

  return frag;
};

// Changes the attributes on a Mark or MarkType on a node if it exists on that
// node
const updateNodeMarkAttrs = (node: Node, mark: Mark, attrs = {}) =>
  mark.isInSet(node.marks)
    ? node.mark(
        mark
          .removeFromSet(node.marks)
          .concat(mark.type.create({ ...mark.attrs, ...attrs }))
      )
    : node;

// ensures that there are no notes in the document that have the same note id
// in non-contiguous places, which would result in one large note between the
// extremes of those places on certain edits
// e.g. <note id="1">test</note> some <note id="1">stuff</note>
// results in
// e.g. <note id="1">test</note> some <note id="2">stuff</note>
const sanitizeFragmentInner = (
  frag: Fragment,
  markType: MarkType,
  replaceAllIds: boolean,
  createId: () => string = v4
) => {
  let idMap: { [prevId: string]: string } = {};
  // the current id of the node according to the input document
  let currentNoteId: string | null = null;

  const setNewId = (prevId: string) => {
    const newId = !idMap[prevId] && !replaceAllIds ? prevId : createId();
    idMap[prevId] = newId;
    currentNoteId = prevId;
    return newId;
  };

  // This will return an updated id for this id depending on whether it's been
  // seen before in a previous non-contiguous note range, if it's been seen
  // before then a new id will be generated and used for this id while the range
  // is contiguous
  const getAdjustNoteId = (id: string) => {
    if (id === currentNoteId) {
      return idMap[id];
    }
    return setNewId(id);
  };

  const closeNote = () => {
    currentNoteId = null;
  };

  return updateFragmentNodes(node => {
    const noteMark = markType.isInSet(node.marks);
    if (noteMark) {
      return updateNodeMarkAttrs(node, noteMark, {
        id: getAdjustNoteId(noteMark.attrs.id)
      });
    }

    // if we're in a text node and we don't have a noteMark then assume we are
    // not in a note and close the range
    if (node.isText) {
      closeNote();
    }

    return node;
  })(frag);
};

// markTypes can either be a MarkType or MarkType[]
const sanitizeFragment = (
  frag: Fragment,
  markTypes: MarkType[],
  replaceAllIds: boolean,
  createId?: () => string
) =>
  markTypes.reduce(
    (nextFrag, markType) =>
      sanitizeFragmentInner(nextFrag, markType, replaceAllIds, createId),
    frag
  );

// Similar to sanitizeFragment but allows a node to be passed instead
const sanitizeNode = (
  node: Node,
  markTypes: MarkType[],
  replaceAllIds: boolean,
  createId?: () => string
) =>
  node.copy(sanitizeFragment(node.content, markTypes, replaceAllIds, createId));

// Return an array of all of the new ranges in a document [[start, end], ...]
const getInsertedRanges = ({ mapping }: Transaction) => {
  let ranges: [number, number][] = [];
  mapping.maps.forEach((stepMap, i) => {
    stepMap.forEach((oldStart, oldEnd, newStart, newEnd) => {
      ranges.push([
        mapping.slice(i + 1).map(newStart),
        mapping.slice(i + 1).map(newEnd)
      ]);
    });
  });
  return ranges;
};

export { readRangesFromDoc, getInsertedRanges, sanitizeNode, sanitizeFragment };
