export type HoverHintCursor = "grab" | "pointer" | "help";

export function createHoverHintController({
  element,
  cursorElement,
  getPointer,
  isDragging,
  setHighlightedDongNames,
}: {
  element: HTMLDivElement;
  cursorElement: HTMLElement;
  getPointer: () => { x: number; y: number };
  isDragging: () => boolean;
  setHighlightedDongNames: (dongNames: string[]) => void;
}) {
  let activeText = "";
  let activeVisible = false;
  let activeCursor: HoverHintCursor = "grab";
  let activeX = Number.NaN;
  let activeY = Number.NaN;

  const update = (
    nextText: string | null,
    nextCursor: HoverHintCursor,
    highlightedDongNames: string[],
  ) => {
    setHighlightedDongNames(highlightedDongNames);

    if (!nextText) {
      if (activeVisible) {
        element.style.display = "none";
        activeVisible = false;
      }
      activeText = "";
      activeX = Number.NaN;
      activeY = Number.NaN;
      if (!isDragging() && activeCursor !== "grab") {
        cursorElement.style.cursor = "grab";
        activeCursor = "grab";
      }
      return;
    }

    const pointer = getPointer();
    if (!activeVisible) {
      element.style.display = "block";
      activeVisible = true;
    }
    if (activeText !== nextText) {
      element.textContent = nextText;
      activeText = nextText;
    }
    if (activeX !== pointer.x) {
      element.style.left = `${pointer.x}px`;
      activeX = pointer.x;
    }
    if (activeY !== pointer.y) {
      element.style.top = `${pointer.y}px`;
      activeY = pointer.y;
    }
    if (!isDragging() && activeCursor !== nextCursor) {
      cursorElement.style.cursor = nextCursor;
      activeCursor = nextCursor;
    }
  };

  return {
    clear: () => update(null, "grab", []),
    update,
  };
}
