export class SelectionManager {
    constructor(grid, onSelectionChange) {
        this.grid = grid;
        this.selection = null;
        this.anchorCell = null;
        this.onSelectionChange = onSelectionChange;
    }

    clearSelection() {
        this.selection = null;
        this.anchorCell = null;
        this.onSelectionChange(null);
    }

    setAnchor(row, col) {
        this.anchorCell = { row, col };
        this.selectCell(row, col);
    }

    extendTo(row, col) {
        if (!this.anchorCell) return;

        const startRow = Math.min(this.anchorCell.row, row);
        const startCol = Math.min(this.anchorCell.col, col);
        const endRow = Math.max(this.anchorCell.row, row);
        const endCol = Math.max(this.anchorCell.col, col);

        this.selection = {
            type: "range",
            start: { row: startRow, col: startCol },
            end: { row: endRow, col: endCol },
        };
        this.onSelectionChange(this.selection);
    }

    selectCell(row, col) {
        this.selection = { type: "cell", row, col };
        this.onSelectionChange(this.selection);
    }

    selectCol(col) {
        this.selection = { type: "col", col };
        this.onSelectionChange(this.selection);
    }

    selectRow(row) {
        this.selection = { type: "row", row };
        this.onSelectionChange(this.selection);
    }

    getActiveCell() {
        if (!this.selection) return null;
        if (this.selection.type === "cell") return this.selection;
        if (this.selection.type === "range") return this.selection.start;
        return null;
    }

    draw(ctx, scrollX, scrollY) {
        if (!this.selection) return;

        const { rowManager, columnManager, options, canvas } = this.grid;
        const { headerHeight, headerWidth } = options;

        ctx.fillStyle = "rgba(0, 123, 255, 0.2)";
        ctx.strokeStyle = "rgba(0, 123, 255, 1)";
        ctx.lineWidth = 2;

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
                y = 0;
                w = columnManager.getWidth(col);
                h = canvas.height;
                break;
            }
            case "row": {
                const { row } = this.selection;
                x = 0;
                y = rowManager.getPosition(row, headerHeight) - scrollY;
                w = canvas.width;
                h = rowManager.getHeight(row);
                break;
            }
            default:
                return;
        }

        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
    }
}
