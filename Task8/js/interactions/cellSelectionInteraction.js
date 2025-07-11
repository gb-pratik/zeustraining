/**
 * Handles all user interactions for selecting cells in the main grid area
 * and the "select all" corner box.
 * Also manages auto-scrolling when dragging a selection out of the viewport.
 */
export class CellSelectionInteraction {
    constructor(grid) {
        this.grid = grid;
        this.isSelecting = false;
        // Replaced setInterval ID with requestAnimationFrame ID
        this.autoScrollRequestId = null;
        this.scrollSpeed = { x: 0, y: 0 };
        this.lastPointerPos = { x: 0, y: 0 };
    }

    /**
     * Checks if the pointer is over the main content area or the select-all box.
     * @param {PointerEvent} e The pointer event.
     * @returns {string|null} The CSS cursor style or null.
     */
    hitTest(e) {
        const { x, y } = this.grid._getPointerPos(e);
        const { headerWidth, headerHeight } = this.grid.options;
        if (x > headerWidth && y > headerHeight) {
            return "default";
        }
        if (x < headerWidth && y < headerHeight) {
            return "default";
        }
        return null;
    }

    /**
     * Starts a cell selection or select-all action.
     * @param {PointerEvent} e The pointer event.
     */
    onPointerDown(e) {
        this.isSelecting = true;
        this.lastPointerPos = this.grid._getPointerPos(e);
        const { x, y } = this.lastPointerPos;
        const { headerWidth, headerHeight } = this.grid.options;

        if (x < headerWidth && y < headerHeight) {
            this.grid.selectionManager.selectAll();
        } else {
            const rowIndex = this.grid._getRowIndexAt(y);
            const colIndex = this.grid._getColIndexAt(x);
            if (rowIndex !== -1 && colIndex !== -1) {
                this.grid.selectionManager.setAnchor(
                    rowIndex,
                    colIndex,
                    e.shiftKey
                );
            }
        }
        this.grid.requestDraw();
    }

    /**
     * Extends the selection as the user drags the pointer.
     * Manages auto-scrolling if the drag goes near the edge of the viewport.
     * @param {PointerEvent} e The pointer event.
     */
    onPointerMove(e) {
        if (!this.isSelecting) return;

        this.lastPointerPos = this.grid._getPointerPos(e);
        const { x, y } = this.lastPointerPos;

        this._updateAutoScrollState(x, y);

        const rowIndex = this.grid._getRowIndexAt(y);
        const colIndex = this.grid._getColIndexAt(x);
        this.grid.selectionManager.extendTo(rowIndex, colIndex);

        // Only request a draw if not auto-scrolling, as the rAF loop handles its own drawing.
        if (!this.autoScrollRequestId) {
            this.grid.requestDraw();
        }
    }

    /**
     * Finalizes the selection and stops any auto-scrolling.
     * @param {PointerEvent} e The pointer event.
     */
    onPointerUp(e) {
        this.isSelecting = false;
        this._stopAutoScroll();
    }

    /**
     * The main loop for auto-scrolling, driven by requestAnimationFrame.
     */
    _scrollStep() {
        // If the selection has ended or the request was cancelled, stop the loop.
        if (!this.isSelecting || !this.autoScrollRequestId) {
            this._stopAutoScroll();
            return;
        }

        // 1. Scroll the grid by the current speed.
        this.grid._onScrollBarScroll(this.scrollSpeed.x, this.scrollSpeed.y);

        // 2. Extend the selection to the cell under the last known pointer position.
        const { x, y } = this.lastPointerPos;
        const rowIndex = this.grid._getRowIndexAt(y);
        const colIndex = this.grid._getColIndexAt(x);
        this.grid.selectionManager.extendTo(rowIndex, colIndex);

        // 3. Request a redraw to show the updated scroll and selection.
        this.grid.requestDraw();

        // 4. Schedule the next frame.
        this.autoScrollRequestId = requestAnimationFrame(
            this._scrollStep.bind(this)
        );
    }

    // --- Auto-scroll Logic ---
    _updateAutoScrollState(x, y) {
        const { headerWidth, headerHeight } = this.grid.options;
        const viewWidth = this.grid.canvas.clientWidth;
        const viewHeight = this.grid.canvas.clientHeight;
        const hotZone = 30;
        const maxSpeed = 20;

        let scrollSpeedX = 0;
        let scrollSpeedY = 0;

        if (x > viewWidth - hotZone) {
            scrollSpeedX = maxSpeed * ((x - (viewWidth - hotZone)) / hotZone);
        } else if (x < headerWidth + hotZone) {
            scrollSpeedX = -maxSpeed * ((headerWidth + hotZone - x) / hotZone);
        }

        if (y > viewHeight - hotZone) {
            scrollSpeedY = maxSpeed * ((y - (viewHeight - hotZone)) / hotZone);
        } else if (y < headerHeight + hotZone) {
            scrollSpeedY = -maxSpeed * ((headerHeight + hotZone - y) / hotZone);
        }

        this.scrollSpeed = { x: scrollSpeedX, y: scrollSpeedY };

        if (scrollSpeedX !== 0 || scrollSpeedY !== 0) {
            this._startAutoScroll();
        } else {
            this._stopAutoScroll();
        }
    }

    _startAutoScroll() {
        // If a scroll loop is already active, do nothing.
        if (this.autoScrollRequestId) return;

        // Start the animation loop.
        this.autoScrollRequestId = requestAnimationFrame(
            this._scrollStep.bind(this)
        );
    }

    _stopAutoScroll() {
        // If a scroll loop is active, cancel it.
        if (this.autoScrollRequestId) {
            cancelAnimationFrame(this.autoScrollRequestId);
            this.autoScrollRequestId = null;
        }
    }
}
