import { Decoration } from "prosemirror-view";

const createEndDeco = (
  pos: number,
  side: "start" | "end",
  type: string,
  id: string,
  cursor: number | null,
  bias: number
) => {
  const span = document.createElement("span");
  span.classList.add("end", `end--${side}`, `end--${type}`);
  return Decoration.widget(pos, span, {
    key: `${side}:${id}:${cursor === pos ? bias : ""}`,
    side: -bias,
    marks: []
  });
};

export { createEndDeco };
