/**
 * Handles user interaction for selecting one or more rows from the header.
 */
export class RowSelectionInteraction {
    constructor(grid) {
        this.grid = grid;
        this.isSelecting = false;
    }

    /**
     * Checks if the pointer is over the row header area.
     * @param {PointerEvent} e The pointer event.
     * @returns {string|null} The CSS cursor style or null.
     */
    hitTest(e) {
        const { x, y } = this.grid._getPointerPos(e);
        const { headerWidth, headerHeight } = this.grid.options;
        if (x < headerWidth && y > headerHeight) {
            return "default"; // Or a right-arrow cursor if desired
        }
        return null;
    }

    /**
     * Starts a row selection action.
     * @param {PointerEvent} e The pointer event.
     */
    onPointerDown(e) {
        const { x, y } = this.grid._getPointerPos(e);
        const rowIndex = this.grid._getRowIndexAt(y);
        if (rowIndex !== -1) {
            this.isSelecting = true;
            this.grid.selectionManager.selectRow(rowIndex, e.shiftKey);
            this.grid.requestDraw();
        }
    }

    /**
     * Extends the row selection as the user drags the pointer.
     * @param {PointerEvent} e The pointer event.
     */
    onPointerMove(e) {
        if (!this.isSelecting) return;
        const { x, y } = this.grid._getPointerPos(e);
        const rowIndex = this.grid._getRowIndexAt(y);
        // extendTo is smart enough to use the selectionMode ('row') set on pointer down
        this.grid.selectionManager.extendTo(rowIndex, 0);
        this.grid.requestDraw();
    }

    /**
     * Finalizes the selection.
     * @param {PointerEvent} e The pointer event.
     */
    onPointerUp(e) {
        this.isSelecting = false;
    }
}
