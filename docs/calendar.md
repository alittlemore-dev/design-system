# Calendars

Import `CalendarComponent`, `MiniCalendarComponent`, and their models from the primary public
`@alittlemore.dev/design-system` entry point. The packed demo lives at `/preview/calendar`.

Both components require consumer-owned `id`, ISO `date`, ISO `today`, and `labels`. They support
English and Russian calendar presentation through `dateLocale`. The package does not own a clock,
i18n service, API client, event editor, or workspace route.

`CalendarComponent` accepts neutral `entries`, a controlled `view` (`month`, `week`, `day`,
`agenda`, `year`), a restricted `views` list, `timeZone` (default `UTC`), and `loading`.
Entries carry a stable ID, title, ISO start, optional exclusive ISO end, all-day flag, accessible
type label, optional decorative icon, and semantic tone (`accent`, `info`, `neutral`). Consumers
map their domain types to these tones; color is supplemented by the accessible type label and icon.
Month entries stay in one clipped line with separate hit targets. Busy days show three entries
and a labelled “more” action. Month cells reserve those three compact rows before the engine's
first measurement; week and day all-day areas reserve only the rows needed by their entries.

Bind `dateChange` and `viewChange` back to controlled inputs. `rangeChange` reports an exclusive
visible range suitable for consumer-owned data loading. `entrySelected` returns the original
neutral entry. `dateSelected` reports a selected date/time, including busy-day “more” activation;
the consumer decides whether to show details, navigation, or an editor. The demo opens date and
entry details in a modal dialog, retaining focus across entry selection and restoring it on close.
The component does not
perform those actions itself. FullCalendar stays private, initializes after browser rendering,
and runs its timers outside Angular's zone while output callbacks re-enter Angular.

`MiniCalendarComponent` accepts optional ISO `markedDates` and emits `dateChange` when a day is
chosen. Browsing a month emits `monthChange` without changing the committed date. Share the date
with the full calendar to coordinate navigation. Arrow keys move focus by a day or week,
Home/End use localized week boundaries, Page Up/Down browse months, Shift with Page Up/Down
browses years, and Enter/Space choose the focused date. Today, selection, and marks are distinct;
the grid uses one tab stop and retains focus when keyboard navigation crosses a month boundary.

Choose responsive view policy in the consumer. The demo starts in Agenda at phone widths and
Month on larger screens; explicit view changes remain available at every width. Component styles
use existing theme tokens, are bundled with the packed component, and require no extra consumer
FullCalendar stylesheet imports.

The engine is loaded only after a full calendar is rendered in the browser. Importing UI or mini-calendar components does not download FullCalendar. `loadError` reports a runtime chunk failure; consumers provide localized feedback and retry by reloading the page, as browsers retain failed module imports. Destruction during loading prevents initialization.
