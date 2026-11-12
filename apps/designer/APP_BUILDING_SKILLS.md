# App building skills

When asked for app building skills, answer with this list. Give each skill’s name and its description. Apply a skill when it is named.

## Button format 1

Selectable buttons use the Sequence Operations filter pill. At rest the button is a white pill with a gray border and a muted label. When it is clicked or selected, the label turns purple, the fill turns soft purple, and the border picks up a blue tint. Add the class `button-format-1`. Mark the selected button with `is-on` or `active`. Use `buttonFormat1(selected)` from `src/buttonFormat1.ts`. Primary actions such as Save and Submit stay on `.btn` and `.btn-primary`. Screen tabs, chapter links, and list rows keep their own shapes and only borrow these selected colors where a control is a pill or a toggle.

## Filter01

Filtering uses one field. Selected values sit in that field as chips with a colored dot, and each chip can be removed. Opening the field shows a search, then All. All has a dropdown of the categories for the items on that page, and the list under it is the items in the chosen category. A star in the search matches any text. Ten searches are stored, newest first, and the oldest drops off when an eleventh is saved. Use the `Filter01` component in `src/components/Filter01.tsx`.
