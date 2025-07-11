import { ResizeColCommand } from "../commandManager.js";

/**
 * Handles the user interaction for resizing a column.
 */
export class ColumnResizeInteraction {
    constructor(grid) {
        this.grid = grid;
        this.interactionData = null; // { colIndex, startX, originalWidth }
    }

    /**
     * Checks if the pointer is over a column resize handle.
     * @param {PointerEvent} e The pointer event.
     * @returns {string|null} The CSS cursor style or null.
     */
    hitTest(e) {
        const { x, y } = this.grid._getPointerPos(e);
        const handle = this.grid._getResizeHandle(x, y);
        if (handle && handle.type === "col") {
            return "col-resize";
        }
        return null;
    }

    /**
     * Starts the column resizing interaction.
     * @param {PointerEvent} e The pointer event.
     */
    onPointerDown(e) {
        const { x, y } = this.grid._getPointerPos(e);
        const resizeHandle = this.grid._getResizeHandle(x, y);
        if (!resizeHandle) return;

        this.interactionData = {
            colIndex: resizeHandle.index,
            startX: x,
            originalWidth: this.grid.columnManager.getWidth(resizeHandle.index),
        };
    }

    /**
     * Handles the dragging movement to resize the column in real-time.
     * @param {PointerEvent} e The pointer event.
     */
    onPointerMove(e) {
        if (!this.interactionData) return;
        const { x } = this.grid._getPointerPos(e);
        const dx = x - this.interactionData.startX;
        const newWidth = Math.max(20, this.interactionData.originalWidth + dx);
        this.grid.columnManager.customWidths.set(
            this.interactionData.colIndex,
            newWidth
        );
        this.grid.columnManager.positionCache.clear();
        this.grid.columnManager.sortedCustomWidths = null;
        this.grid.requestDraw();
    }

    /**
     * Finalizes the resize, creating a command for the undo/redo stack.
     * @param {PointerEvent} e The pointer event.
     */
    onPointerUp(e) {
        if (!this.interactionData) return;
        const { colIndex, originalWidth } = this.interactionData;
        const newWidth = this.grid.columnManager.getWidth(colIndex);
        if (newWidth !== originalWidth) {
            const command = new ResizeColCommand(
                this.grid.columnManager,
                colIndex,
                originalWidth,
                newWidth,
                () => this.grid.requestDraw()
            );
            this.grid.commandManager.execute(command);
        }
        this.interactionData = null;
    }
}
