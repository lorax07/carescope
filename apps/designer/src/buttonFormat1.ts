/** Button format 1. Selectable pill from Sequence Operations. */
export const BUTTON_FORMAT_1 = "button-format-1";

export function buttonFormat1(selected = false): string {
  return selected ? `${BUTTON_FORMAT_1} is-on` : BUTTON_FORMAT_1;
}
