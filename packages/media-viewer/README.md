# @afilmory/media-viewer

Reusable primitives for fullscreen media viewers:

- shared-element entry/exit transitions between a trigger thumbnail and the viewer stage
- mobile vertical gestures for inspector reveal and drag-to-dismiss
- frame projection utilities for mapping viewer transforms back into list/grid thumbnails

## What stays in the host app

This package intentionally does not own:

- routing and history timing
- data fetching and media loading
- chrome like share buttons, EXIF panels, thumbnails, or toolbars
- placeholder rendering details

The host app provides those concerns and wires them to:

- `useMediaViewerTransitions`
- `SharedElementTransitionPreview`
- `useMediaViewerMobileInteractions`

## Expected trigger contract

The default trigger lookup uses `data-viewer-transition-id="<item.id>"`.

If a viewer opens from a grid/list item, the host should:

1. put `data-viewer-transition-id` on the clickable media shell
2. pass the clicked `HTMLElement` as `triggerElement` on open
3. keep the same `item.id` when the viewer closes so exit lookup can recover the live thumbnail
