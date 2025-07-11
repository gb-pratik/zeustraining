import { ResizeRowCommand } from "../commandManager.js";

/**
 * Handles the user interaction for resizing a row.
 */
export class RowResizeInteraction {
    constructor(grid) {
        this.grid = grid;
        this.interactionData = null; // { rowIndex, startY, originalHeight }
    }

    /**
     * Checks if the pointer is over a row resize handle.
     * @param {PointerEvent} e The pointer event.
     * @returns {string|null} The CSS cursor style or null.
     */
    hitTest(e) {
        const { x, y } = this.grid._getPointerPos(e);
        const handle = this.grid._getResizeHandle(x, y);
        if (handle && handle.type === "row") {
            return "row-resize";
        }
        return null;
    }

    /**
     * Starts the row resizing interaction.
     * @param {PointerEvent} e The pointer event.
     */
    onPointerDown(e) {
        const { x, y } = this.grid._getPointerPos(e);
        const resizeHandle = this.grid._getResizeHandle(x, y);
        if (!resizeHandle) return;

        this.interactionData = {
            rowIndex: resizeHandle.index,
            startY: y,
            originalHeight: this.grid.rowManager.getHeight(resizeHandle.index),
        };
    }

    /**
     * Handles the dragging movement to resize the row in real-time.
     * @param {PointerEvent} e The pointer event.
     */
    onPointerMove(e) {
        if (!this.interactionData) return;
        const { y } = this.grid._getPointerPos(e);
        const dy = y - this.interactionData.startY;
        const newHeight = Math.max(
            20,
            this.interactionData.originalHeight + dy
        );
        this.grid.rowManager.customHeights.set(
            this.interactionData.rowIndex,
            newHeight
        );
        this.grid.rowManager.positionCache.clear();
        this.grid.rowManager.sortedCustomHeights = null;
        this.grid.requestDraw();
    }

    /**
     * Finalizes the resize, creating a command for the undo/redo stack.
     * @param {PointerEvent} e The pointer event.
     */
    onPointerUp(e) {
        if (!this.interactionData) return;
        const { rowIndex, originalHeight } = this.interactionData;
        const newHeight = this.grid.rowManager.getHeight(rowIndex);
        if (newHeight !== originalHeight) {
            const command = new ResizeRowCommand(
                this.grid.rowManager,
                rowIndex,
                originalHeight,
                newHeight,
                () => this.grid.requestDraw()
            );
            this.grid.commandManager.execute(command);
        }
        this.interactionData = null;
    }
}
