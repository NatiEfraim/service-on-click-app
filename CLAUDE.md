# Components first

Every time new UI code is written (a feature, a fix, a style change), check before writing it whether it belongs in a
component instead of raw markup, CSS or logic written in place.

## Before writing new code

1. **Look for an existing component or hook that already does it**, and use it:
   - `src/components/ui/`: Button, Select, Field, FormDialog, Modal, Drawer, Feedback (Loading, EmptyState, ErrorNotice,
     Notice, FormError), ClearFilters, SearchField, DateRangePicker, TimePicker, Chips, Controls (Seg), Card, Stat,
     Tooltip, AnimatedText, SmoothSize, FadeIn, ExpandRow, DataTable, CountBadge, Reveal (fold open / closed),
     usePresence, useExitGhost, useOutsideClose (outside click / Escape), useWindowMeasure (position on screen).
   - `src/components/booking/`: DomainBadge / DomainIcon, TypePicture (a type's picture or its fallback), TypeIcon,
     Ticket, RouteViz, useRowPreview, CategoryGroup, SerialTitle, RequesterRows, CommentsPanel, StepperNav / useStepKeys.
   - Hooks in `src/lib/` (useDebounced, useFitToWindow, useInfiniteScroll, useToggleSet, useSaveMutation /
     handleWriteError, …) and each feature's own folder.
2. **Extend it rather than copy it.** If a component almost fits, add a prop to it instead of writing a near-copy.
3. **Make a new component or hook when the same markup, styles or logic would now exist in two or more places**, or
   when it is a self-contained piece of UI with its own behaviour (state, motion, measuring). Shared pieces go in
   `src/components/ui/` (generic) or `src/components/booking/` (booking-specific); pieces used by one feature only stay
   in that feature's folder.
4. **Raw code stays raw only when it is truly one-off.** A raw `<button>` is fine for a custom tile or row whose look
   no shared component has; a plain button uses `<Button>`. A raw `<select>` is never fine (always `Select`).

## When reporting work

Say which existing components were reused, which new ones were made, and any repeated code that was left in place
on purpose (and why). If an existing piece of duplicated code was noticed along the way, mention it as a possible
follow-up instead of refactoring it unasked.
