import { Decoration } from "prosemirror-view";

const createEndDeco = (
  pos: number,
  side: "start" | "end",
  type: string,
  id: string,
  cursor: number | null,
  bias: number,
  railIndex: number
) => {
  console.log(-bias * (railIndex + 1), type);
  const span = document.createElement("span");
  span.classList.add("end", `end--${side}`, `end--${type}`);
  const sideBias = side === "start" ? 1 : -1;
  return Decoration.widget(pos, span, {
    key: `${side}:${id}:${cursor === pos ? bias : ""}`,
    side: -bias + (sideBias * (railIndex + 1)),
    marks: []
  });
};

export { createEndDeco };
