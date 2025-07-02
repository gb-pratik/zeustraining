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

    draw(ctx, scrollX, scrollY) {
        if (!this.selection) return;

        const { rowManager, columnManager, options, canvas } = this.grid;
        const { headerHeight, headerWidth } = options;

        ctx.fillStyle = "rgba(19, 126, 67,0.08)";
        ctx.strokeStyle = "rgba(19, 126, 67,1)";
        ctx.lineWidth = 2;

        let x, y, w, h;

        switch (this.selection.type) {
            case "cell": {
                const { row, col } = this.selection;
                x = columnManager.getPosition(col, headerWidth) - scrollX;
                y = rowManager.getPosition(row, headerHeight) - scrollY;
                w = columnManager.getWidth(col);
                h = rowManager.getHeight(row);
                // ctx.fillRect(x, y, w, h);
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

                // Fill around the anchor cell
                // Left of anchor
                ctx.fillRect(x, y, anchorX - x, h);
                // Right of anchor
                ctx.fillRect(
                    anchorX + anchorW,
                    y,
                    x + w - (anchorX + anchorW),
                    h
                );
                // Above anchor
                ctx.fillRect(anchorX, y, anchorW, anchorY - y);
                // Below anchor
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
                h = canvas.height - headerHeight;
                ctx.fillRect(x, y, w, h);
                break;
            }
            case "row": {
                const { row } = this.selection;
                x = headerWidth;
                y = rowManager.getPosition(row, headerHeight) - scrollY;
                w = canvas.width - headerWidth;
                h = rowManager.getHeight(row);
                ctx.fillRect(x, y, w, h);
                break;
            }
            default:
                return;
        }

        // Draw header highlights and selection border
        ctx.fillStyle = "rgba(19, 126, 67,0.3)";
        ctx.fillRect(x, 0, w, headerHeight);
        ctx.fillRect(0, y, headerWidth, h);
        ctx.fillStyle = "rgb(0, 0, 0)";

        ctx.strokeRect(x, headerHeight, w, 0);
        ctx.strokeRect(headerWidth, y, 0, h);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.moveTo(x + w, y - 1);
        ctx.lineTo(x + w, y + h - 4);
        ctx.moveTo(x + w - 4, y + h);
        ctx.lineTo(x, y + h);
        ctx.moveTo(x, y + h + 1);
        ctx.lineTo(x, y - 1);
        ctx.stroke();

        ctx.fillStyle = "rgb(16,124,65)";
        ctx.fillRect(x + w - 2.8, y + h - 2.8, 4.4, 4.4);
    }
}
