const { Fragment } = require("prosemirror-model");

let _id = 1;
const getGetID = () => {
  _id = 1;
  return () => _id++;
};

const normalizeIds = (_node, idMap = {}, getID = getGetID()) => {
  const node = _node.copy(Fragment.from(_node.content)).mark(
    _node.marks.map(({ attrs, type }) => {
      idMap[attrs.id] = idMap[attrs.id] || getID();
      return type.create({ id: idMap[attrs.id], type: attrs.type });
    })
  );

  const children = [];

  node.content.forEach(_child => {
    const child = normalizeIds(_child, idMap, getID);
    children.push(child);
  });

  return node.copy(Fragment.from(children));
};

module.exports = { normalizeIds };
