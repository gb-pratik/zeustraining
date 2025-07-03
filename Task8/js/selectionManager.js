export class SelectionManager {
    constructor(grid, onSelectionChange) {
        this.grid = grid;
        this.selection = null;
        this.anchorCell = null;
        this.onSelectionChange = onSelectionChange;
        this.selectionMode = "cell";
    }

    clearSelection() {
        this.selection = null;
        this.anchorCell = null;
        this.onSelectionChange(null);
    }

    setAnchor(row, col) {
        this.anchorCell = { row, col };
        this.selectCell(row, col);
        this.selectionMode = "cell";
    }

    extendTo(row, col) {
        if (!this.anchorCell) return;

        if (this.selectionMode === "row") {
            const startRow = Math.min(this.anchorCell.row, row);
            const endRow = Math.max(this.anchorCell.row, row);
            this.selection = {
                type: "range",
                start: { row: startRow, col: 0 },
                end: { row: endRow, col: this.grid.options.totalCols - 1 },
            };
        } else if (this.selectionMode === "col") {
            const startCol = Math.min(this.anchorCell.col, col);
            const endCol = Math.max(this.anchorCell.col, col);
            this.selection = {
                type: "range",
                start: { row: 0, col: startCol },
                end: { row: this.grid.options.totalRows - 1, col: endCol },
            };
        } else {
            const startRow = Math.min(this.anchorCell.row, row);
            const startCol = Math.min(this.anchorCell.col, col);
            const endRow = Math.max(this.anchorCell.row, row);
            const endCol = Math.max(this.anchorCell.col, col);

            this.selection = {
                type: "range",
                start: { row: startRow, col: startCol },
                end: { row: endRow, col: endCol },
            };
        }
        this.onSelectionChange(this.selection);
    }

    selectCell(row, col) {
        this.selection = { type: "cell", row, col };
        this.onSelectionChange(this.selection);
    }

    selectCol(col) {
        this.selection = { type: "col", col };
        this.anchorCell = { row: 0, col: col };
        this.selectionMode = "col";
        this.onSelectionChange(this.selection);
    }

    selectRow(row) {
        this.selection = { type: "row", row };
        this.anchorCell = { row: row, col: 0 };
        this.selectionMode = "row";
        this.onSelectionChange(this.selection);
    }

    getActiveCell() {
        if (!this.selection) return null;
        if (this.selection.type === "cell") return this.selection;
        if (this.selection.type === "range") return this.anchorCell;
        if (this.selection.type === "row" || this.selection.type === "col") {
            return this.anchorCell;
        }
        return null;
    }

    // Calculates the screen dimensions of the current selection.
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
                    columnManager.getPosition(end.col + 1, headerWidth) -
                    scrollX;
                const endY =
                    rowManager.getPosition(end.row, headerHeight) +
                    rowManager.getHeight(end.row) -
                    scrollY;
                w = endX - x;
                h = endY - y;
                break;
            }
            case "col": {
                const { col } = this.selection;
                x = columnManager.getPosition(col, headerWidth) - scrollX;
                y = headerHeight;
                w = columnManager.getWidth(col);
                h = canvas.clientHeight - headerHeight;
                break;
            }
            case "row": {
                const { row } = this.selection;
                x = headerWidth;
                y = rowManager.getPosition(row, headerHeight) - scrollY;
                w = canvas.clientWidth - headerWidth;
                h = rowManager.getHeight(row);
                break;
            }
            default:
                return null;
        }
        return { x, y, w, h };
    }

    // Draws the selection highlights on the headers.
    drawHeaderHighlights(ctx, scrollX, scrollY) {
        const box = this._getSelectionBoundingBox(scrollX, scrollY);
        if (!box) return;

        const { x, y, w, h } = box;
        const { headerHeight, headerWidth } = this.grid.options;

        ctx.save();
        ctx.fillStyle = "rgba(19, 126, 67,0.3)";

        // Draw column header highlight, clipped to the column header area
        const colHighlightX = Math.max(x, headerWidth);
        const colHighlightW = x + w - colHighlightX;
        if (colHighlightW > 0) {
            ctx.fillRect(colHighlightX, 0, colHighlightW, headerHeight);
        }

        // Draw row header highlight, clipped to the row header area
        const rowHighlightY = Math.max(y, headerHeight);
        const rowHighlightH = y + h - rowHighlightY;
        if (rowHighlightH > 0) {
            ctx.fillRect(0, rowHighlightY, headerWidth, rowHighlightH);
        }

        // Header highlights border
        ctx.strokeStyle = "rgba(19, 126, 67,1)";
        ctx.lineWidth = 2;

        // Line at the bottom of the column header selection
        if (x + w > headerWidth) {
            ctx.beginPath();
            ctx.moveTo(Math.max(x, headerWidth), headerHeight);
            ctx.lineTo(x + w, headerHeight);
            ctx.stroke();
        }

        // Line at the right of the row header selection
        if (y + h > headerHeight) {
            ctx.beginPath();
            ctx.moveTo(headerWidth, Math.max(y, headerHeight));
            ctx.lineTo(headerWidth, y + h);
            ctx.stroke();
        }

        ctx.restore();
    }

    // Draws the selection visuals within the grid's content area.
    drawContent(ctx, scrollX, scrollY) {
        if (!this.selection) return;

        const { rowManager, columnManager, options, canvas } = this.grid;
        const { headerHeight, headerWidth } = options;

        ctx.save();
        ctx.fillStyle = "rgba(19, 126, 67,0.08)";
        let x, y, w, h;

        switch (this.selection.type) {
            case "cell": {
                const { row, col } = this.selection;
                x = columnManager.getPosition(col, headerWidth) - scrollX;
                y = rowManager.getPosition(row, headerHeight) - scrollY;
                w = columnManager.getWidth(col);
                h = rowManager.getHeight(row);
                ctx.fillRect(x, y, w, h);
                break;
            }
            case "range": {
                const { start, end } = this.selection;
                x = columnManager.getPosition(start.col, headerWidth) - scrollX;
                y = rowManager.getPosition(start.row, headerHeight) - scrollY;
                const endX =
                    columnManager.getPosition(end.col + 1, headerWidth) -
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

                ctx.fillRect(x, y, anchorX - x, h);
                ctx.fillRect(
                    anchorX + anchorW,
                    y,
                    x + w - (anchorX + anchorW),
                    h
                );
                ctx.fillRect(anchorX, y, anchorW, anchorY - y);
                ctx.fillRect(
                    anchorX,
                    anchorY + anchorH,
                    anchorW,
                    y + h - (anchorY + anchorH)
                );
                break;
            }
            case "col": {
                const { col } = this.selection;
                x = columnManager.getPosition(col, headerWidth) - scrollX;
                y = headerHeight;
                w = columnManager.getWidth(col);
                h = canvas.clientHeight - headerHeight;

                const anchorY =
                    rowManager.getPosition(0, headerHeight) - scrollY;
                const anchorH = rowManager.getHeight(0);

                const fillStartY = anchorY + anchorH;
                const drawY = Math.max(y, fillStartY);
                const drawHeight = y + h - drawY;

                if (drawHeight > 0) {
                    ctx.fillRect(x, drawY, w, drawHeight);
                }
                break;
            }
            case "row": {
                const { row } = this.selection;
                x = headerWidth;
                y = rowManager.getPosition(row, headerHeight) - scrollY;
                w = canvas.clientWidth - headerWidth;
                h = rowManager.getHeight(row);

                const anchorX =
                    columnManager.getPosition(0, headerWidth) - scrollX;
                const anchorW = columnManager.getWidth(0);

                const fillStartX = anchorX + anchorW;
                const drawX = Math.max(x, fillStartX);
                const drawWidth = x + w - drawX;

                if (drawWidth > 0) {
                    ctx.fillRect(drawX, y, drawWidth, h);
                }
                break;
            }
            default:
                ctx.restore();
                return;
        }

        // Get overall bounding box for the border and handle
        const box = this._getSelectionBoundingBox(scrollX, scrollY);
        if (!box) {
            ctx.restore();
            return;
        }
        const { x: boxX, y: boxY, w: boxW, h: boxH } = box;

        // Draw content border and handle
        ctx.strokeStyle = "rgba(19, 126, 67,1)";
        ctx.lineWidth = 2;

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

        ctx.restore();
    }
}
