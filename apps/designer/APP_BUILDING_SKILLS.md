# App building skills

When asked for app building skills, answer with this list. Give each skill’s name and its description. Apply a skill when it is named.

## Button format 1

Selectable buttons use the Sequence Operations filter pill. At rest the button is a white pill with a gray border and a muted label. When it is clicked or selected, the label turns purple, the fill turns soft purple, and the border picks up a blue tint. Add the class `button-format-1`. Mark the selected button with `is-on` or `active`. Use `buttonFormat1(selected)` from `src/buttonFormat1.ts`. Primary actions such as Save and Submit stay on `.btn` and `.btn-primary`. Screen tabs, chapter links, and list rows keep their own shapes and only borrow these selected colors where a control is a pill or a toggle.

## Filter01

Filtering uses one field. Selected values sit in that field as chips with a colored dot, and each chip can be removed. Opening the field shows a search, then All. All has a dropdown of the categories for the items on that page, and the list under it is the items in the chosen category. An Apply pill sits on the right of All and commits the checks and the search. A pin on the right inside the filter field saves that filter as a pill beside the field. Clicking the saved pill applies it. A star in the search matches any text. Ten searches are stored, newest first, and the oldest drops off when an eleventh is saved. Use the `Filter01` component in `src/components/Filter01.tsx`.

## Tab01

The main tabs, such as Accounts and Contacts. The row rests on a thin gray baseline. The selected tab is a folder cap with a rounded top and a page-colored fill. Its bottom is open along the baseline, so the tab continues into the section it shows, and the label is purple. Unselected labels are gray with no fill. Add the class `tab01` to the tablist. Mark the selected control with `is-on`.

## subtab01

The subtabs under a Tab01, such as Home and an open account or contact, and Activity, Documents, and Notes. The shape matches the connected folder cap: gray labels on a thin baseline, and the selected tab lifts with a rounded top, a light fill, and an open bottom into its section. On a page the fill is the page background. Inside a white card the fill is white. Add the class `subtab01`. Mark the selected control with `is-on`. Set `--subtab-fill` when the section behind the tab is not the page background.
