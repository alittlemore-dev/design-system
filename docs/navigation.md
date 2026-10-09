# Navigation and sidebar

`SidebarComponent`, `NavigationComponent`, and `IconComponent` replace `FoldableTreeComponent`.
Import them from `@alittlemore.dev/design-system`.

## Composition

The sidebar is inline page navigation. On desktop it allocates a 13rem column alongside page
content; collapsing leaves a compact icon toggle. Below 768px it places the disclosure above page
content. It never opens a modal, dims the page, traps focus, or locks scrolling. Use `DrawerComponent`
for a global service menu that needs modal behavior.

```html
<ds-sidebar
  panelId="workspace-sections"
  label="Sections"
  openLabel="Open sections"
  closeLabel="Close sections"
  [open]="navigationOpen()"
  (openChange)="navigationOpen.set($event)"
>
  <ds-navigation
    dsSidebarNavigation
    id="workspace-navigation"
    label="Workspace navigation"
    [rootItems]="rootItems"
    [groups]="groups"
    [selectedItemKey]="currentPage()"
    [defaultExpandedGroupKeys]="['guides']"
    emptyMessage="No sections"
    (itemSelected)="navigate($event)"
  />
  <router-outlet />
</ds-sidebar>
```

Provide unique, stable IDs. Sidebar state is controlled by the consumer, which owns breakpoint
policy and persistence. Hidden navigation retains its DOM and disclosure state. Escape inside the
sidebar requests closing and focuses the same toggle. External closing also restores the toggle
when focus was inside the hidden panel; focus elsewhere stays unchanged.

`NavigationItem` requires `key`, `label`, and `href`; optional `icon` and `badgeText` add decoration.
`NavigationGroup` requires `key`, `label`, and `items`. Groups are headings by default. Set
`collapsible: true` for folders; optional `icon: 'folder'` supplies their shared icon. Folder controls
are native buttons, links remain native anchors, and the selected link has `aria-current="page"`.

The `itemSelected` output provides `{ item, event }` for ordinary primary activation. A router
adapter may call `event.preventDefault()` and navigate to `item.href`. Modified and middle clicks
preserve native link behavior without emitting a selection. Without an adapter, ordinary anchors
also navigate natively. The component does not own routing, authentication, i18n, or selection state.

`IconComponent` renders a decorative, non-focusable SVG. Use `name` from `IconName` and optional
`size` (default 20). Icon-only controls must provide their accessible label on the enclosing button.
Labels and all translated text belong to the consumer.

## Migration

- Replace `FoldableTreeComponent` with `NavigationComponent` and its model types with
  `NavigationItem` and `NavigationGroup`.
- Add `href` to every item; rename `sections` to `groups` and
  `defaultExpandedSectionKeys` to `defaultExpandedGroupKeys`.
- Set `collapsible: true` on groups that represent folders. Ordinary section groups stay expanded.
- Replace the old selected-key callback with the `NavigationSelection` router adapter above.
- Supply `id` and `label`; remove `sectionTestId`, `itemTestId`, and `trailingText`.
- Wrap page navigation and page content in `SidebarComponent` when collapse is needed. Global
  modal drawers retain their separate behavior.

The packed demo's catalogue and `/preview/navigation` exercise both grouped links and folders.
