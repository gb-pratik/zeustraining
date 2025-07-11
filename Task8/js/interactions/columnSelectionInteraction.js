/**
 * Handles user interaction for selecting one or more columns from the header.
 */
export class ColumnSelectionInteraction {
    constructor(grid) {
        this.grid = grid;
        this.isSelecting = false;
    }

    /**
     * Checks if the pointer is over the column header area.
     * @param {PointerEvent} e The pointer event.
     * @returns {string|null} The CSS cursor style or null.
     */
    hitTest(e) {
        const { x, y } = this.grid._getPointerPos(e);
        const { headerWidth, headerHeight } = this.grid.options;
        if (y < headerHeight && x > headerWidth) {
            return "default"; // Or a down-arrow cursor if desired
        }
        return null;
    }

    /**
     * Starts a column selection action.
     * @param {PointerEvent} e The pointer event.
     */
    onPointerDown(e) {
        const { x, y } = this.grid._getPointerPos(e);
        const colIndex = this.grid._getColIndexAt(x);
        if (colIndex !== -1) {
            this.isSelecting = true;
            this.grid.selectionManager.selectCol(colIndex, e.shiftKey);
            this.grid.requestDraw();
        }
    }

    /**
     * Extends the column selection as the user drags the pointer.
     * @param {PointerEvent} e The pointer event.
     */
    onPointerMove(e) {
        if (!this.isSelecting) return;
        const { x, y } = this.grid._getPointerPos(e);
        const colIndex = this.grid._getColIndexAt(x);
        // extendTo is smart enough to use the selectionMode ('col') set on pointer down
        this.grid.selectionManager.extendTo(0, colIndex);
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
