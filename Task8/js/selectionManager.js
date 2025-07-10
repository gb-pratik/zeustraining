export class SelectionManager {
    // Initializes the selection manager.
    constructor(grid, onSelectionChange) {
        this.grid = grid;
        this.selection = null;
        this.anchorCell = null;
        this.focusCell = null;
        this.onSelectionChange = onSelectionChange;
        this.selectionMode = "cell";
    }

    // Clears the current selection and resets anchor/focus points.
    clearSelection() {
        this.selection = null;
        this.anchorCell = null;
        this.focusCell = null;
        this.onSelectionChange(null);
    }

    // Sets the anchor cell, which is the starting point for a selection.
    setAnchor(row, col, shiftKey = false) {
        this.selectionMode = "cell";

        if (shiftKey && this.anchorCell) {
            this.extendTo(row, col);
        } else {
            this.anchorCell = { row, col };
            this.focusCell = { row, col };
            this.selectCell(row, col);
        }
        console.log("Anchor point", this.anchorCell.row, this.anchorCell.col);
        console.log("focus point", this.focusCell.row, this.focusCell.col);
    }

    // Extends the selection from the anchor cell to a new cell.
    extendTo(row, col) {
        if (!this.anchorCell) return;

        console.log("Anchor point", this.anchorCell.row, this.anchorCell.col);
        console.log("focus point", this.focusCell.row, this.focusCell.col);
        console.log("HOLA");
        // Prevent extension if the relevant coordinate is invalid for the current mode.
        if (this.selectionMode === "row" && row === -1) return;
        if (this.selectionMode === "col" && col === -1) return;
        if (this.selectionMode === "cell" && (row === -1 || col === -1)) return;

        this.focusCell = { row, col };

        if (this.anchorCell.row === row && this.anchorCell.col === col) {
            if (this.selectionMode === "cell") {
                this.selectCell(row, col);
            }
            // In row/col mode, a single-element range is still a range
        }

        if (this.selectionMode === "row") {
            const startRow = Math.min(this.anchorCell.row, row);
            const endRow = Math.max(this.anchorCell.row, row);
            this.selection = {
                type: "range",
                start: { row: startRow, col: 0 },
                end: { row: endRow, col: this.grid.getEffectiveMaxCol() },
            };
        } else if (this.selectionMode === "col") {
            const startCol = Math.min(this.anchorCell.col, col);
            const endCol = Math.max(this.anchorCell.col, col);
            this.selection = {
                type: "range",
                start: { row: 0, col: startCol },
                end: { row: this.grid.getEffectiveMaxRow(), col: endCol },
            };
        } else {
            const startRow = Math.min(this.anchorCell.row, row);
            const startCol = Math.min(this.anchorCell.col, col);
            const endRow = Math.max(this.anchorCell.row, row);
            const endCol = Math.max(this.anchorCell.col, col);

            console.log(startRow, startCol, endRow, endCol);
            this.selection = {
                type: "range",
                start: { row: startRow, col: startCol },
                end: { row: endRow, col: endCol },
            };
        }

        console.log(this.selection);
        this.onSelectionChange(this.selection);
    }

    // Selects a single cell.
    selectCell(row, col) {
        this.selection = { type: "cell", row, col };
        this.onSelectionChange(this.selection);
    }

    // Selects an entire column.
    selectCol(col, shiftKey = false) {
        // This action's intent is column-based, so set the mode immediately.
        this.selectionMode = "col";
        if (shiftKey && this.anchorCell) {
            // Now that mode is 'col', extendTo will create the correct range type
            // using the anchor's column and the newly clicked column.
            this.extendTo(this.anchorCell.row, col);
        } else {
            // This is a new selection. Reset anchor and focus for a column.
            this.anchorCell = { row: 0, col: col };
            this.focusCell = { row: this.grid.getEffectiveMaxRow(), col: col };
            this.selection = {
                type: "range",
                start: { row: 0, col: col },
                end: { row: this.grid.getEffectiveMaxRow(), col: col },
            };
            this.onSelectionChange(this.selection);
        }
    }

    // Selects an entire row.
    selectRow(row, shiftKey = false) {
        // This action's intent is row-based, so set the mode immediately.
        this.selectionMode = "row";

        if (shiftKey && this.anchorCell) {
            // Now that mode is 'row', extendTo will create the correct range type
            // using the anchor's row and the newly clicked row.
            this.extendTo(row, this.anchorCell.col);
        } else {
            // This is a new selection. Reset anchor and focus for a row.
            this.anchorCell = { row: row, col: 0 };
            this.focusCell = { row: row, col: this.grid.getEffectiveMaxCol() };
            this.selection = {
                type: "range",
                start: { row: row, col: 0 },
                end: { row: row, col: this.grid.getEffectiveMaxCol() },
            };
            this.onSelectionChange(this.selection);
        }
    }

    // Selects all cells in the grid.
    selectAll() {
        this.selectionMode = "cell";
        this.selection = {
            type: "range",
            start: { row: 0, col: 0 },
            end: {
                row: this.grid.getEffectiveMaxRow(),
                col: this.grid.getEffectiveMaxCol(),
            },
        };
        this.anchorCell = { row: 0, col: 0 };
        this.focusCell = { row: 0, col: 0 };
        this.onSelectionChange(this.selection);
    }

    // Gets the active cell, which is typically the anchor of the selection.
    getActiveCell() {
        if (!this.selection) return null;
        if (this.selection.type === "cell") return this.selection;
        return this.anchorCell;
    }

    // Gets the focus cell, which is the cell that moves when extending a selection.
    getFocusCell() {
        return this.focusCell || this.getActiveCell();
    }

    // Moves the anchor cell within an existing range selection without changing its bounds.
    moveAnchor(row, col) {
        if (!this.selection || this.selection.type !== "range") return;
        this.anchorCell = { row, col };
        this.focusCell = { row, col };
        this.onSelectionChange(this.selection);
    }

    // Dynamically updates selection bounds for full-row/col selections on scroll.
    updateSelectionBoundsOnScroll() {
        if (!this.selection || this.selection.type !== "range") return;

        let needsUpdate = false;
        const newSelection = JSON.parse(JSON.stringify(this.selection));

        // Full column(s) selection
        if (this.selectionMode === "col" && this.selection.start.row === 0) {
            const newMaxRow = this.grid.getEffectiveMaxRow();
            if (newSelection.end.row !== newMaxRow) {
                newSelection.end.row = newMaxRow;
                needsUpdate = true;
            }
        }
        // Full row(s) selection
        else if (
            this.selectionMode === "row" &&
            this.selection.start.col === 0
        ) {
            const newMaxCol = this.grid.getEffectiveMaxCol();
            if (newSelection.end.col !== newMaxCol) {
                newSelection.end.col = newMaxCol;
                needsUpdate = true;
            }
        }
        // Select All
        else if (
            this.selectionMode === "cell" &&
            this.selection.start.row === 0 &&
            this.selection.start.col === 0
        ) {
            const newMaxRow = this.grid.getEffectiveMaxRow();
            const newMaxCol = this.grid.getEffectiveMaxCol();
            if (
                newSelection.end.row !== newMaxRow ||
                newSelection.end.col !== newMaxCol
            ) {
                newSelection.end.row = newMaxRow;
                newSelection.end.col = newMaxCol;
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            this.selection = newSelection;
            // This triggers status bar updates etc.
            this.onSelectionChange(this.selection);
        }
    }

    // Calculates the on-screen pixel coordinates and dimensions of the selection.
    _getSelectionBoundingBox(scrollX, scrollY) {
        if (!this.selection) return null;
        const { rowManager, columnManager, options, canvas } = this.grid;
        const { headerHeight, headerWidth } = options;
        let x, y, w, h;

        switch (this.selection.type) {
            case "cell": {
                const { row, col } = this.selection;
                x = columnManager.getPosition(col, headerWidth) - scrollX;
                y = rowManager.getPosition(row, headerHeight) - scrollY;
                w = columnManager.getWidth(col);
                h = rowManager.getHeight(row);
                break;
            }
            case "range": {
                const { start, end } = this.selection;
                x = columnManager.getPosition(start.col, headerWidth) - scrollX;
                y = rowManager.getPosition(start.row, headerHeight) - scrollY;
                const endX =
                    columnManager.getPosition(end.col, headerWidth) +
                    columnManager.getWidth(end.col) -
                    scrollX;
                const endY =
                    rowManager.getPosition(end.row, headerHeight) +
                    rowManager.getHeight(end.row) -
                    scrollY;
                w = endX - x;
                h = endY - y;

                // For full row/col selections, draw to edge of viewport
                if (this.selectionMode === "col") {
                    y = headerHeight;
                    h = canvas.clientHeight - headerHeight;
                } else if (this.selectionMode === "row") {
                    x = headerWidth;
                    w = canvas.clientWidth - headerWidth;
                }
                break;
            }
            default:
                return null;
        }
        return { x, y, w, h };
    }

    // Draws the selection highlights on the column and row headers.
    drawHeaderHighlights(ctx, scrollX, scrollY) {
        const box = this._getSelectionBoundingBox(scrollX, scrollY);
        if (!box) return;

        const { x, y, w, h } = box;
        const { headerHeight, headerWidth } = this.grid.options;

        ctx.save();
        ctx.fillStyle = "rgba(59, 180, 114, 0.25)";

        const colHighlightX = Math.max(x, headerWidth);
        const colHighlightW = x + w - colHighlightX;
        if (colHighlightW > 0) {
            ctx.fillRect(colHighlightX, 10, colHighlightW, headerHeight - 10);
        }

        const rowHighlightY = Math.max(y, headerHeight);
        const rowHighlightH = y + h - rowHighlightY;
        if (rowHighlightH > 0) {
            ctx.fillRect(0, rowHighlightY, headerWidth, rowHighlightH);
        }

        ctx.strokeStyle = "rgba(19, 126, 67,1)";
        ctx.lineWidth = 2;

        if (x + w > headerWidth) {
            ctx.beginPath();
            ctx.moveTo(Math.max(x, headerWidth), headerHeight);
            ctx.lineTo(x + w, headerHeight);
            ctx.stroke();
        }

        if (y + h > headerHeight) {
            ctx.beginPath();
            ctx.moveTo(headerWidth, Math.max(y, headerHeight));
            ctx.lineTo(headerWidth, y + h);
            ctx.stroke();
        }

        ctx.restore();
    }

    // Draws the selection visuals (fill, border, handle) in the main grid area.
    drawContent(ctx, scrollX, scrollY, type) {
        if (!this.selection) return;

        const { rowManager, columnManager, options } = this.grid;
        const { headerHeight, headerWidth } = options;

        ctx.save();
        ctx.fillStyle = "rgba(19, 126, 67,0.08)";
        let x, y, w, h;

        switch (this.selection.type) {
            case "cell": {
                break;
            }
            case "range": {
                const { start, end } = this.selection;
                x = columnManager.getPosition(start.col, headerWidth) - scrollX;
                y = rowManager.getPosition(start.row, headerHeight) - scrollY;
                const endX =
                    columnManager.getPosition(end.col, headerWidth) +
                    columnManager.getWidth(end.col) -
                    scrollX;
                const endY =
                    rowManager.getPosition(end.row, headerHeight) +
                    rowManager.getHeight(end.row) -
                    scrollY;
                w = endX - x;
                h = endY - y;

                const { row: anchorRow, col: anchorCol } = this.anchorCell;
                const anchorW = columnManager.getWidth(anchorCol);
                const anchorH = rowManager.getHeight(anchorRow);
                const anchorX =
                    columnManager.getPosition(anchorCol, headerWidth) - scrollX;
                const anchorY =
                    rowManager.getPosition(anchorRow, headerHeight) - scrollY;

                ctx.fillRect(x, y, w, anchorY - y);
                ctx.fillRect(
                    x,
                    anchorY + anchorH,
                    w,
                    y + h - (anchorY + anchorH)
                );
                ctx.fillRect(x, anchorY, anchorX - x, anchorH);
                ctx.fillRect(
                    anchorX + anchorW,
                    anchorY,
                    x + w - (anchorX + anchorW),
                    anchorH
                );
                break;
            }
            default:
                ctx.restore();
                return;
        }

        const box = this._getSelectionBoundingBox(scrollX, scrollY);
        if (!box) {
            ctx.restore();
            return;
        }
        const { x: boxX, y: boxY, w: boxW, h: boxH } = box;

        ctx.strokeStyle = "rgba(19, 126, 67,1)";
        ctx.lineWidth = 2;

        if (type === 0) {
        } else {
            ctx.beginPath();
            ctx.moveTo(boxX, boxY);
            ctx.lineTo(boxX + boxW, boxY);
            ctx.moveTo(boxX + boxW, boxY - 1);
            ctx.lineTo(boxX + boxW, boxY + boxH - 4);
            ctx.moveTo(boxX + boxW - 4, boxY + boxH);
            ctx.lineTo(boxX, boxY + boxH);
            ctx.moveTo(boxX, boxY + boxH + 1);
            ctx.lineTo(boxX, boxY - 1);
            ctx.stroke();

            ctx.fillStyle = "rgb(16,124,65)";
            ctx.fillRect(boxX + boxW - 2.8, boxY + boxH - 2.8, 4.4, 4.4);
        }

        ctx.restore();
    }
}
