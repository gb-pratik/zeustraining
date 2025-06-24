// Use code with caution.
import { ColumnManager } from "./columnManager.js";
import { RowManager } from "./rowManager.js";
import { CellManager } from "./cellManager.js";
import { SelectionManager } from "./selectionManager.js";
import {
    CommandManager,
    EditCellCommand,
    ResizeColCommand,
    ResizeRowCommand,
} from "./commandManager.js";
import { StatusBar } from "./statusBar.js";
import { ScrollBarManager } from "./scrollBarManager.js";

export class Grid {
    constructor(canvas, options) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.options = {
            totalRows: 100000,
            totalCols: 500,
            defaultRowHeight: 25,
            defaultColWidth: 100,
            headerHeight: 30,
            headerWidth: 50,
            font: "14px Arial",
            ...options,
        };

        this.dpr = window.devicePixelRatio || 1;

        this.scrollX = 0;
        this.scrollY = 0;

        this.interactionState = "none";
        this.interactionData = null;
        this.isDrawing = false;
        this.commandManager = new CommandManager();
        this.cellManager = new CellManager();
        this.columnManager = new ColumnManager({
            totalCols: this.options.totalCols,
            defaultWidth: this.options.defaultColWidth,
        });
        this.rowManager = new RowManager({
            totalRows: this.options.totalRows,
            defaultHeight: this.options.defaultRowHeight,
        });
        this.statusBar = new StatusBar();
        this.selectionManager = new SelectionManager(
            this,
            this.onSelectionChange.bind(this)
        );
        this.scrollBarManager = new ScrollBarManager(
            this,
            this._onScrollBarScroll.bind(this)
        );

        this._bindEvents();
        this.resizeCanvas(); // Initial setup
    }

    async init() {
        await this.columnManager.loadWidths();
        await this.rowManager.loadHeights();
        this.draw();
    }

    _bindEvents() {
        window.addEventListener("resize", this.resizeCanvas.bind(this));
        this.canvas.addEventListener(
            "mousedown",
            this._handleMouseDown.bind(this)
        );
        window.addEventListener(
            "mousemove",
            this._handleGlobalMouseMove.bind(this)
        );
        window.addEventListener(
            "mouseup",
            this._handleGlobalMouseUp.bind(this)
        );
        this.canvas.addEventListener(
            "dblclick",
            this._handleDoubleClick.bind(this)
        );
        this.canvas.addEventListener("wheel", this._handleWheel.bind(this), {
            passive: false,
        });
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();

        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;

        this.canvas.width = Math.floor(rect.width * this.dpr);
        this.canvas.height = Math.floor(rect.height * this.dpr);

        this.draw();
    }

    async draw() {
        if (this.isDrawing) return;
        this.isDrawing = true;

        const viewWidth = this.canvas.clientWidth;
        const viewHeight = this.canvas.clientHeight;

        this.ctx.save();

        this.ctx.scale(this.dpr, this.dpr);

        const visibleRange = this._getVisibleRange();
        const visibleCellData = await this.cellManager.getVisibleCellData(
            visibleRange
        );

        this.ctx.clearRect(0, 0, viewWidth, viewHeight);
        this.ctx.font = this.options.font;

        this.ctx.save();
        this.ctx.translate(0.5, 0.5);

        this._drawGridLines(visibleRange);
        this._drawHeaders(visibleRange);

        this.ctx.restore();

        this._drawVisibleCellData(visibleRange, visibleCellData);

        this.selectionManager.draw(this.ctx, this.scrollX, this.scrollY);

        this.scrollBarManager.update(this.scrollX, this.scrollY);
        this.scrollBarManager.draw(this.ctx);

        this.ctx.restore();

        this.isDrawing = false;
    }

    _drawGridLines(visibleRange) {
        const { startRow, endRow, startCol, endCol } = visibleRange;
        const { headerWidth, headerHeight } = this.options;
        const viewWidth = this.canvas.clientWidth;
        const viewHeight = this.canvas.clientHeight;

        this.ctx.lineWidth = 1 / this.dpr;
        this.ctx.strokeStyle = "#e0e0e0";
        this.ctx.beginPath();

        let x =
            this.columnManager.getPosition(startCol, headerWidth) -
            this.scrollX;
        for (let i = startCol; i <= endCol; i++) {
            if (x > headerWidth) {
                this.ctx.moveTo(Math.round(x), headerHeight);
                this.ctx.lineTo(Math.round(x), viewHeight);
            }
            x += this.columnManager.getWidth(i);
        }

        let y =
            this.rowManager.getPosition(startRow, headerHeight) - this.scrollY;
        for (let i = startRow; i <= endRow; i++) {
            if (y > headerHeight) {
                this.ctx.moveTo(headerWidth, Math.round(y));
                this.ctx.lineTo(viewWidth, Math.round(y));
            }
            y += this.rowManager.getHeight(i);
        }
        this.ctx.stroke();
    }

    _drawHeaders(visibleRange) {
        const { startRow, endRow, startCol, endCol } = visibleRange;
        const { headerWidth, headerHeight, font } = this.options;
        const viewWidth = this.canvas.clientWidth;
        const viewHeight = this.canvas.clientHeight;

        this.ctx.fillStyle = "#f8f9fa";
        this.ctx.fillRect(-0.5, -0.5, viewWidth, headerHeight);
        this.ctx.fillRect(-0.5, -0.5, headerWidth, viewHeight);

        this.ctx.fillStyle = "#555";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.font = `bold ${font}`;

        let currentX =
            this.columnManager.getPosition(startCol, headerWidth) -
            this.scrollX;
        for (let i = startCol; i <= endCol; i++) {
            const colWidth = this.columnManager.getWidth(i);
            const colLabel = this._getColLabel(i);
            this.ctx.fillText(
                colLabel,
                currentX + colWidth / 2,
                headerHeight / 2
            );
            currentX += colWidth;
        }
        let currentY =
            this.rowManager.getPosition(startRow, headerHeight) - this.scrollY;
        for (let i = startRow; i <= endRow; i++) {
            const rowHeight = this.rowManager.getHeight(i);
            this.ctx.fillText(i + 1, headerWidth / 2, currentY + rowHeight / 2);
            currentY += rowHeight;
        }

        this.ctx.strokeStyle = "#ccc";
        this.ctx.lineWidth = 1 / this.dpr;
        this.ctx.beginPath();
        this.ctx.moveTo(0, Math.round(headerHeight));
        this.ctx.lineTo(viewWidth, Math.round(headerHeight));
        this.ctx.moveTo(Math.round(headerWidth), 0);
        this.ctx.lineTo(Math.round(headerWidth), viewHeight);
        this.ctx.stroke();

        this.ctx.font = font;
    }

    _drawVisibleCellData(visibleRange, visibleCellData) {
        const { startRow, endRow, startCol, endCol } = visibleRange;
        const { headerWidth, headerHeight } = this.options;
        this.ctx.fillStyle = "#000";
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "middle";
        let y =
            this.rowManager.getPosition(startRow, headerHeight) - this.scrollY;
        for (let r = startRow; r <= endRow; r++) {
            const rowHeight = this.rowManager.getHeight(r);
            let x =
                this.columnManager.getPosition(startCol, headerWidth) -
                this.scrollX;
            for (let c = startCol; c <= endCol; c++) {
                const value = visibleCellData.get(`${r}:${c}`);
                if (value) {
                    this.ctx.save();
                    this.ctx.beginPath();
                    this.ctx.rect(
                        x,
                        y,
                        this.columnManager.getWidth(c),
                        rowHeight
                    );
                    this.ctx.clip();
                    this.ctx.fillText(value, x + 5, y + rowHeight / 2);
                    this.ctx.restore();
                }
                x += this.columnManager.getWidth(c);
            }
            y += rowHeight;
        }
    }
    _handleMouseDown(e) {
        const { x, y } = this._getMousePos(e);
        if (this.scrollBarManager.handleMouseDown(x, y)) {
            this.interactionState = "scrolling";
            return;
        }
        const { headerWidth, headerHeight } = this.options;
        const resizeHandle = this._getResizeHandle(x, y);
        if (resizeHandle) {
            if (resizeHandle.type === "col") {
                this.interactionState = "resizing-col";
                this.interactionData = {
                    colIndex: resizeHandle.index,
                    startX: x,
                    originalWidth: this.columnManager.getWidth(
                        resizeHandle.index
                    ),
                };
                this.canvas.style.cursor = "col-resize";
            } else {
                this.interactionState = "resizing-row";
                this.interactionData = {
                    rowIndex: resizeHandle.index,
                    startY: y,
                    originalHeight: this.rowManager.getHeight(
                        resizeHandle.index
                    ),
                };
                this.canvas.style.cursor = "row-resize";
            }
        } else if (x < headerWidth && y > headerHeight) {
            const rowIndex = this._getRowIndexAt(y);
            if (rowIndex !== -1) {
                this.selectionManager.selectRow(rowIndex);
                this.interactionState = "selecting";
                this.draw();
            }
        } else if (y < headerHeight && x > headerWidth) {
            const colIndex = this._getColIndexAt(x);
            if (colIndex !== -1) {
                this.selectionManager.selectCol(colIndex);
                this.interactionState = "selecting";
                this.draw();
            }
        } else if (x > headerWidth && y > headerHeight) {
            const rowIndex = this._getRowIndexAt(y);
            const colIndex = this._getColIndexAt(x);
            if (rowIndex !== -1 && colIndex !== -1) {
                this.selectionManager.setAnchor(rowIndex, colIndex);
                this.interactionState = "selecting";
                this.draw();
            }
        }
    }
    _handleGlobalMouseMove(e) {
        const { x, y } = this._getMousePos(e);
        if (this.interactionState === "scrolling") {
            this.scrollBarManager.handleMouseMove(x, y);
            return;
        }
        if (this.interactionState === "resizing-col") {
            const dx = x - this.interactionData.startX;
            const newWidth = Math.max(
                20,
                this.interactionData.originalWidth + dx
            );
            this.columnManager.customWidths.set(
                this.interactionData.colIndex,
                newWidth
            );
            this.columnManager.positionCache.clear();
            this.draw();
        } else if (this.interactionState === "resizing-row") {
            const dy = y - this.interactionData.startY;
            const newHeight = Math.max(
                20,
                this.interactionData.originalHeight + dy
            );
            this.rowManager.customHeights.set(
                this.interactionData.rowIndex,
                newHeight
            );
            this.rowManager.positionCache.clear();
            this.draw();
        } else if (this.interactionState === "selecting") {
            const rowIndex = this._getRowIndexAt(y);
            const colIndex = this._getColIndexAt(x);
            if (rowIndex !== -1 && colIndex !== -1) {
                this.selectionManager.extendTo(rowIndex, colIndex);
                this.draw();
            }
        } else if (e.target === this.canvas) {
            this._handleMouseMove(e);
        }
    }
    _handleMouseMove(e) {
        if (this.interactionState !== "none") return;
        const { x, y } = this._getMousePos(e);
        const resizeHandle = this._getResizeHandle(x, y);
        this.canvas.style.cursor = resizeHandle
            ? resizeHandle.type === "col"
                ? "col-resize"
                : "row-resize"
            : "default";
    }
    async _handleGlobalMouseUp(e) {
        if (this.interactionState === "scrolling") {
            this.scrollBarManager.handleMouseUp();
        } else if (this.interactionState === "resizing-col") {
            const { colIndex, originalWidth } = this.interactionData;
            const newWidth = this.columnManager.getWidth(colIndex);
            if (newWidth !== originalWidth) {
                const command = new ResizeColCommand(
                    this.columnManager,
                    colIndex,
                    originalWidth,
                    newWidth,
                    () => this.draw()
                );
                this.commandManager.execute(command);
            }
        } else if (this.interactionState === "resizing-row") {
            const { rowIndex, originalHeight } = this.interactionData;
            const newHeight = this.rowManager.getHeight(rowIndex);
            if (newHeight !== originalHeight) {
                const command = new ResizeRowCommand(
                    this.rowManager,
                    rowIndex,
                    originalHeight,
                    newHeight,
                    () => this.draw()
                );
                this.commandManager.execute(command);
            }
        }
        this.interactionState = "none";
        this.interactionData = null;
        this.canvas.style.cursor = "default";
    }
    _handleDoubleClick(e) {
        const { x, y } = this._getMousePos(e);
        const { headerWidth, headerHeight } = this.options;
        if (x <= headerWidth || y <= headerHeight) return;
        const rowIndex = this._getRowIndexAt(y);
        const colIndex = this._getColIndexAt(x);
        if (rowIndex !== -1 && colIndex !== -1) {
            this._startEditing(rowIndex, colIndex);
        }
    }
    _handleWheel(e) {
        e.preventDefault();
        this._onScrollBarScroll(e.deltaX, e.deltaY);
    }
    _onScrollBarScroll(dx, dy) {
        const maxScrollX = Math.max(
            0,
            this.getTotalContentWidth() - this.canvas.clientWidth
        );
        const maxScrollY = Math.max(
            0,
            this.getTotalContentHeight() - this.canvas.clientHeight
        );
        this.scrollX += dx;
        this.scrollY += dy;
        this.scrollX = Math.max(0, Math.min(this.scrollX, maxScrollX));
        this.scrollY = Math.max(0, Math.min(this.scrollY, maxScrollY));
        this.draw();
    }
    async _startEditing(row, col) {
        const { headerWidth, headerHeight } = this.options;
        const x =
            this.columnManager.getPosition(col, headerWidth) - this.scrollX;
        const y = this.rowManager.getPosition(row, headerHeight) - this.scrollY;
        const width = this.columnManager.getWidth(col);
        const height = this.rowManager.getHeight(row);
        const oldValue = (await this.cellManager.getCellValue(row, col)) || "";
        const input = document.createElement("input");
        input.type = "text";
        input.className = "cell-editor";
        input.value = oldValue;
        input.style.left = `${x}px`;
        input.style.top = `${y}px`;
        input.style.width = `${width}px`;
        input.style.height = `${height}px`;
        input.style.font = this.options.font;
        const finishEditing = () => {
            const newValue = input.value;
            if (newValue !== oldValue) {
                const command = new EditCellCommand(
                    this.cellManager,
                    row,
                    col,
                    oldValue,
                    newValue,
                    () => {
                        this.draw();
                        this.onSelectionChange(this.selectionManager.selection);
                    }
                );
                this.commandManager.execute(command);
            }
            if (document.body.contains(input)) {
                document.body.removeChild(input);
            }
            this.canvas.focus();
        };
        input.addEventListener("blur", finishEditing);
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                input.blur();
            } else if (e.key === "Escape") {
                input.value = oldValue;
                input.blur();
            }
        });
        document.body.appendChild(input);
        input.focus();
        input.select();
    }
    async onSelectionChange(selection) {
        if (!selection) {
            this.statusBar.clear();
            return;
        }
        let startCell, endCell;
        const { totalRows, totalCols } = this.options;
        switch (selection.type) {
            case "cell":
                startCell = { row: selection.row, col: selection.col };
                endCell = startCell;
                break;
            case "range":
                startCell = selection.start;
                endCell = selection.end;
                break;
            case "row":
                startCell = { row: selection.row, col: 0 };
                endCell = { row: selection.row, col: totalCols - 1 };
                break;
            case "col":
                startCell = { row: 0, col: selection.col };
                endCell = { row: totalRows - 1, col: selection.col };
                break;
            default:
                this.statusBar.clear();
                return;
        }
        if (endCell.row - startCell.row > 1000) {
            endCell.row = startCell.row + 999;
        }
        const values = await this.cellManager.getCellRangeData(
            startCell,
            endCell
        );
        this.statusBar.update(values);
    }
    getTotalContentWidth() {
        return this.columnManager.getPosition(
            this.options.totalCols,
            this.options.headerWidth
        );
    }
    getTotalContentHeight() {
        return this.rowManager.getPosition(
            this.options.totalRows,
            this.options.headerHeight
        );
    }
    _getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    _getColLabel(colIndex) {
        let label = "",
            temp = colIndex;
        while (temp >= 0) {
            label = String.fromCharCode((temp % 26) + 65) + label;
            temp = Math.floor(temp / 26) - 1;
        }
        return label;
    }
    _getResizeHandle(x, y) {
        const { headerWidth, headerHeight } = this.options;
        const handleThreshold = 5;
        if (y < headerHeight) {
            const visibleRange = this._getVisibleRange();
            let currentX =
                this.columnManager.getPosition(
                    visibleRange.startCol,
                    headerWidth
                ) - this.scrollX;
            for (let i = visibleRange.startCol; i <= visibleRange.endCol; i++) {
                currentX += this.columnManager.getWidth(i);
                if (Math.abs(x - currentX) < handleThreshold) {
                    return { type: "col", index: i };
                }
            }
        }
        if (x < headerWidth) {
            const visibleRange = this._getVisibleRange();
            let currentY =
                this.rowManager.getPosition(
                    visibleRange.startRow,
                    headerHeight
                ) - this.scrollY;
            for (let i = visibleRange.startRow; i <= visibleRange.endRow; i++) {
                currentY += this.rowManager.getHeight(i);
                if (Math.abs(y - currentY) < handleThreshold) {
                    return { type: "row", index: i };
                }
            }
        }
        return null;
    }
    _getColIndexAt(x) {
        return this.columnManager.getColIndexAt(
            x + this.scrollX,
            this.options.headerWidth
        );
    }
    _getRowIndexAt(y) {
        return this.rowManager.getRowIndexAt(
            y + this.scrollY,
            this.options.headerHeight
        );
    }
    _getVisibleRange() {
        const { headerWidth, headerHeight, totalRows, totalCols } =
            this.options;
        const viewWidth = this.canvas.clientWidth;
        const viewHeight = this.canvas.clientHeight;
        const startRow = this._getRowIndexAt(headerHeight + 1);
        const endRowCheck = this._getRowIndexAt(viewHeight);
        const endRow = endRowCheck !== -1 ? endRowCheck : totalRows - 1;
        const startCol = this._getColIndexAt(headerWidth + 1);
        const endColCheck = this._getColIndexAt(viewWidth);
        const endCol = endColCheck !== -1 ? endColCheck : totalCols - 1;
        return {
            startRow: Math.max(0, startRow),
            endRow: Math.min(totalRows - 1, endRow + 2),
            startCol: Math.max(0, startCol),
            endCol: Math.min(totalCols - 1, endCol + 2),
        };
    }
}
