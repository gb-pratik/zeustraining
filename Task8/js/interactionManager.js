import { ColumnResizeInteraction } from "./interactions/columnResizeInteraction.js";
import { RowResizeInteraction } from "./interactions/rowResizeInteraction.js";
import { ColumnSelectionInteraction } from "./interactions/columnSelectionInteraction.js";
import { RowSelectionInteraction } from "./interactions/rowSelectionInteraction.js";
import { CellSelectionInteraction } from "./interactions/cellSelectionInteraction.js";

/**
 * Manages all pointer-based user interactions with the grid.
 * delegates events to the appropriate interaction handler.
 */
export class InteractionManager {
    constructor(grid) {
        this.grid = grid;

        // The first handler to "claim" an event will become active.
        // Priority is important: more specific hit-zones (like resize handles) come first.
        this.interactionHandlers = [
            new ColumnResizeInteraction(grid),
            new RowResizeInteraction(grid),
            new ColumnSelectionInteraction(grid),
            new RowSelectionInteraction(grid),
            new CellSelectionInteraction(grid),
        ];

        // current interaction identifier
        this.activeInteraction = null;
    }

    /**
     * Handles the initial pointer down event. It determines which interaction
     * should take control and starts it.
     */
    handlePointerDown(e) {
        const { x, y } = this.grid._getPointerPos(e);

        // First, check for scrollbar interaction, which is handled separately.
        if (this.grid.scrollBarManager.isPointerEventOnScrollBar(x, y)) {
            if (this.grid.scrollBarManager.handlePointerDown(x, y)) {
                this.activeInteraction = this.grid.scrollBarManager; // Treat it like an interaction
            }
            return;
        }

        // Find the first handler that can process this event based on cursor hit-test.
        for (const handler of this.interactionHandlers) {
            if (handler.hitTest(e)) {
                this.activeInteraction = handler;
                handler.onPointerDown(e);
                break;
            }
        }
    }

    /**
     * Handles pointer movement events.
     * If an interaction is active, it delegates the event.
     * If not, it updates the cursor based on the pointer's position.
     * @param {PointerEvent} e The pointer event.
     */
    handlePointerMove(e) {
        if (this.activeInteraction) {
            this.activeInteraction.onPointerMove(e);
        } else if (e.target === this.grid.canvas) {
            // No active interaction, so we just update the cursor on hover.
            let cursor = "default";
            for (const handler of this.interactionHandlers) {
                const handlerCursor = handler.hitTest(e);
                if (handlerCursor) {
                    cursor = handlerCursor;
                    break;
                }
            }
            this.grid.canvas.style.cursor = cursor;
        }
    }

    /**
     * Handles the final pointer up event.
     * It delegates to the active interaction to finalize it and then resets.
     * @param {PointerEvent} e The pointer event.
     */
    handlePointerUp(e) {
        if (this.activeInteraction) {
            this.activeInteraction.onPointerUp(e);
            this.activeInteraction = null;
        }
        // Reset cursor to default in case we were over a resize handle
        this.grid.canvas.style.cursor = "default";
    }
}
