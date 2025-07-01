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
    // Initializes the grid, sets up options, creates DOM elements, and initializes managers.
    constructor(container, options) {
        this.container = container;
        this.options = {
            totalRows: 100000,
            totalCols: 1000,
            defaultRowHeight: 21,
            defaultColWidth: 65,
            headerHeight: 30,
            headerWidth: 50,
            font: "14px Arial",
            ...options,
        };

        this._createDOM();

        this.ctx = this.canvas.getContext("2d");
        this.dpr = window.devicePixelRatio || 1;
        this.scrollX = 0;
        this.scrollY = 0;
        this.interactionState = "none";
        this.interactionData = null;
        this.animationFrameId = null;
        this.maxRenderedRow = 0;
        this.maxRenderedCol = 0;

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

        this.statusBar = new StatusBar(this.statusBarElement);

        this.selectionManager = new SelectionManager(
            this,
            this.onSelectionChange.bind(this)
        );
        this.scrollBarManager = new ScrollBarManager(
            this,
            this._onScrollBarScroll.bind(this)
        );

        this._bindEvents();
        this.resizeCanvas();
    }

    // Creates the necessary DOM elements for the grid (container, canvas, status bar).
    _createDOM() {
        // Create grid container
        this.gridContainer = document.createElement("div");
        this.gridContainer.id = "grid-container";

        // Create canvas
        this.canvas = document.createElement("canvas");
        this.canvas.id = "grid-canvas";
        this.canvas.tabIndex = 0;

        this.statusBarElement = document.createElement("div");
        this.statusBarElement.id = "status-bar";

        // Append elements to the main container
        this.gridContainer.appendChild(this.canvas);
        this.container.appendChild(this.gridContainer);
        this.container.appendChild(this.statusBarElement);
    }

    // Asynchronously loads initial data like column widths and row heights.
    async init() {
        await this.columnManager.loadWidths();
        await this.rowManager.loadHeights();

        // Set initial rendered size based on viewport
        const viewHeight = this.canvas.clientHeight || 500;
        const viewWidth = this.canvas.clientWidth || 800;

        let initialRows = this.rowManager.getRowIndexAt(
            this.scrollY + viewHeight,
            this.options.headerHeight
        );
        this.maxRenderedRow = initialRows > 0 ? initialRows + 20 : 50; // Add buffer

        let initialCols = this.columnManager.getColIndexAt(
            this.scrollX + viewWidth,
            this.options.headerWidth
        );
        this.maxRenderedCol = initialCols > 0 ? initialCols + 10 : 20; // Add buffer

        this.requestDraw();
    }

    // Requests an animation frame to draw the grid, preventing multiple draws in a single frame.
    requestDraw() {
        if (!this.animationFrameId) {
            this.animationFrameId = requestAnimationFrame(() => {
                this.draw(); // Draw is now synchronous
                this.animationFrameId = null;
            });
        }
    }

    // Binds all necessary event listeners (mouse, keyboard, resize).
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
        this.canvas.addEventListener("keydown", this._handleKeyDown.bind(this));
    }

    // Handles resizing of the canvas when the window is resized.
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();

        this.dpr = window.devicePixelRatio || 1;

        this.canvas.width = Math.floor(rect.width * this.dpr);
        this.canvas.height = Math.floor(rect.height * this.dpr);

        this.requestDraw();
    }

    // The main drawing loop that renders the grid, headers, cells, and scrollbars.
    draw() {
        const viewWidth = this.canvas.clientWidth;
        const viewHeight = this.canvas.clientHeight;

        const visibleRange = this._getVisibleRange();
        this.maxRenderedRow = Math.max(
            this.maxRenderedRow,
            visibleRange.endRow
        );
        this.maxRenderedCol = Math.max(
            this.maxRenderedCol,
            visibleRange.endCol
        );

        this.ctx.save();
        this.dpr = window.devicePixelRatio || 1;
        this.ctx.scale(this.dpr, this.dpr);

        const visibleCellData =
            this.cellManager.getVisibleCellDataFromCache(visibleRange);

        this.ctx.clearRect(0, 0, viewWidth, viewHeight);
        this.ctx.font = this.options.font;

        this._drawGridLines(visibleRange);
        this._drawHeaders(visibleRange);
        this._drawVisibleCellData(visibleRange, visibleCellData);
        this.selectionManager.draw(this.ctx, this.scrollX, this.scrollY);

        this.scrollBarManager.update(this.scrollX, this.scrollY);
        this.scrollBarManager.draw(this.ctx);

        this.ctx.restore();

        this.cellManager
            .prefetchVisibleCellData(visibleRange)
            .then((newDataLoaded) => {
                if (newDataLoaded) {
                    this.requestDraw();
                }
            });
    }

    // Draws the grid lines for the visible range of cells.
    _drawGridLines(visibleRange) {
        const { startRow, endRow, startCol, endCol } = visibleRange;
        const { headerWidth, headerHeight } = this.options;
        const viewWidth = this.canvas.clientWidth;
        const viewHeight = this.canvas.clientHeight;

        this.ctx.save();
        this.ctx.translate(0.5, 0.5);
        this.ctx.lineWidth = 1 / this.dpr;
        this.ctx.strokeStyle = "rgb(224, 224, 224)";
        this.ctx.beginPath();

        let currentX =
            this.columnManager.getPosition(startCol, headerWidth) -
            this.scrollX;
        for (let i = startCol; i <= endCol + 1; i++) {
            const x = Math.floor(currentX);
            if (x > headerWidth) {
                this.ctx.moveTo(x, headerHeight);
                this.ctx.lineTo(x, viewHeight);
            }
            if (i <= endCol) {
                currentX += this.columnManager.getWidth(i);
            }
        }

        let currentY =
            this.rowManager.getPosition(startRow, headerHeight) - this.scrollY;
        for (let i = startRow; i <= endRow + 1; i++) {
            const y = Math.floor(currentY);
            if (y > headerHeight) {
                this.ctx.moveTo(headerWidth, y);
                this.ctx.lineTo(viewWidth, y);
            }
            if (i <= endRow) {
                currentY += this.rowManager.getHeight(i);
            }
        }
        this.ctx.stroke();
        this.ctx.restore();
    }

    // Draws the column and row headers.
    _drawHeaders(visibleRange) {
        const { startRow, endRow, startCol, endCol } = visibleRange;
        const { headerWidth, headerHeight, font } = this.options;
        const viewWidth = this.canvas.clientWidth;
        const viewHeight = this.canvas.clientHeight;

        this.ctx.fillStyle = "rgb(245, 245, 245)";
        this.ctx.fillRect(0, 0, viewWidth, headerHeight);
        this.ctx.fillRect(0, 0, headerWidth, viewHeight);

        this.ctx.fillStyle = "rgb(97, 97, 97)";
        this.ctx.textBaseline = "middle";
        this.ctx.font = `semi-bold ${font}`;

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(headerWidth, 0, viewWidth - headerWidth, headerHeight);
        this.ctx.clip();
        this.ctx.textAlign = "center";
        let currentX =
            this.columnManager.getPosition(startCol, headerWidth) -
            this.scrollX;
        for (let i = startCol; i <= endCol; i++) {
            const colWidth = this.columnManager.getWidth(i);
            this.ctx.fillText(
                this._getColLabel(i),
                currentX + colWidth / 2,
                headerHeight / 2
            );
            currentX += colWidth;
        }
        this.ctx.restore();

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(0, headerHeight, headerWidth, viewHeight - headerHeight);
        this.ctx.clip();
        this.ctx.textAlign = "right";
        let currentY =
            this.rowManager.getPosition(startRow, headerHeight) - this.scrollY;
        for (let i = startRow; i <= endRow; i++) {
            const rowHeight = this.rowManager.getHeight(i);
            this.ctx.fillText(i + 1, headerWidth - 6, currentY + rowHeight / 2);
            currentY += rowHeight;
        }
        this.ctx.restore();
        this.ctx.font = font;

        this.ctx.save();
        this.ctx.translate(0.5, 0.5);
        this.ctx.lineWidth = 1 / this.dpr;
        this.ctx.strokeStyle = "#ccc";
        this.ctx.beginPath();

        currentX =
            this.columnManager.getPosition(startCol, headerWidth) -
            this.scrollX;
        for (let i = startCol; i <= endCol; i++) {
            const x = Math.floor(currentX);
            if (x >= headerWidth) {
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, headerHeight);
            }
            currentX += this.columnManager.getWidth(i);
        }

        currentY =
            this.rowManager.getPosition(startRow, headerHeight) - this.scrollY;
        for (let i = startRow; i <= endRow; i++) {
            const y = Math.floor(currentY);
            if (y >= headerHeight) {
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(headerWidth, y);
            }
            currentY += this.rowManager.getHeight(i);
        }

        this.ctx.moveTo(0, Math.floor(headerHeight));
        this.ctx.lineTo(viewWidth, Math.floor(headerHeight));
        this.ctx.moveTo(Math.floor(headerWidth), 0);
        this.ctx.lineTo(Math.floor(headerWidth), viewHeight);

        this.ctx.stroke();
        this.ctx.restore();
    }

    // Draws the data for the visible cells.
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
                const colWidth = this.columnManager.getWidth(c);
                const value = visibleCellData.get(`${r}:${c}`);
                if (value) {
                    this.ctx.save();
                    this.ctx.beginPath();
                    this.ctx.rect(x, y, colWidth, rowHeight);
                    this.ctx.clip();
                    let num = Number(value);
                    if (typeof num === "number" && !isNaN(num)) {
                        const len = this.ctx.measureText(value);
                        this.ctx.fillText(
                            value,
                            x +
                                (this.columnManager.getWidth(c) - len.width) -
                                2,
                            y + rowHeight / 2
                        );
                    } else {
                        this.ctx.fillText(value, x + 5, y + rowHeight / 2);
                    }
                    this.ctx.restore();
                }
                x += colWidth;
            }
            y += rowHeight;
        }
    }

    // Handles the `mousedown` event for selection, resizing, and scrolling.
    _handleMouseDown(e) {
        this.canvas.focus();
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
                this.requestDraw();
            }
        } else if (y < headerHeight && x > headerWidth) {
            const colIndex = this._getColIndexAt(x);
            if (colIndex !== -1) {
                this.selectionManager.selectCol(colIndex);
                this.interactionState = "selecting";
                this.requestDraw();
            }
        } else if (x > headerWidth && y > headerHeight) {
            const rowIndex = this._getRowIndexAt(y);
            const colIndex = this._getColIndexAt(x);
            if (rowIndex !== -1 && colIndex !== -1) {
                this.selectionManager.setAnchor(rowIndex, colIndex);
                this.interactionState = "selecting";
                this.requestDraw();
            }
        }
    }

    // Handles the global `mousemove` event for resizing, selecting, and scrolling.
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
            this.columnManager.sortedCustomWidths = null;
            this.requestDraw();
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
            this.rowManager.sortedCustomHeights = null;
            this.requestDraw();
        } else if (this.interactionState === "selecting") {
            const rowIndex = this._getRowIndexAt(y);
            const colIndex = this._getColIndexAt(x);
            if (rowIndex !== -1 && colIndex !== -1) {
                this.selectionManager.extendTo(rowIndex, colIndex);
                this.requestDraw();
                this._ensureCellIsVisible(rowIndex + 1, colIndex + 1);
            }
        } else if (e.target === this.canvas) {
            this._handleMouseMove(e);
        }
    }

    // Handles the `mousemove` event over the canvas to change the cursor for resizing.
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

    // Handles the global `mouseup` event to finish actions like resizing.
    async _handleGlobalMouseUp(e) {
        if (this.interactionState === "scrolling") {
            this.scrollBarManager.handleMouseUp();
            this.requestDraw();
        } else if (this.interactionState === "resizing-col") {
            const { colIndex, originalWidth } = this.interactionData;
            const newWidth = this.columnManager.getWidth(colIndex);
            if (newWidth !== originalWidth) {
                const command = new ResizeColCommand(
                    this.columnManager,
                    colIndex,
                    originalWidth,
                    newWidth,
                    () => this.requestDraw()
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
                    () => this.requestDraw()
                );
                this.commandManager.execute(command);
            }
        }
        this.interactionState = "none";
        this.interactionData = null;
        this.canvas.style.cursor = "default";
    }

    // Handles the `dblclick` event to start editing a cell.
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

    // Handles the `wheel` event for scrolling.
    _handleWheel(e) {
        e.preventDefault();
        this._onScrollBarScroll(e.deltaX, e.deltaY);
    }

    // Handles `keydown` events for navigating the grid with arrow keys.
    _handleKeyDown(e) {
        const currentSelection = this.selectionManager.selection;
        if (!currentSelection) return;

        const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
        if (!arrowKeys.includes(e.key)) return;

        e.preventDefault();

        let { row, col } = this.selectionManager.getActiveCell();
        let nextRow = row;
        let nextCol = col;

        if (currentSelection.type === "range") {
            nextRow = currentSelection.start.row;
            nextCol = currentSelection.start.col;
        }
        switch (e.key) {
            case "ArrowUp":
                nextRow = Math.max(0, row - 1);
                break;
            case "ArrowDown":
                nextRow = Math.min(this.options.totalRows - 1, row + 1);
                break;
            case "ArrowLeft":
                nextCol = Math.max(0, col - 1);
                break;
            case "ArrowRight":
                nextCol = Math.min(this.options.totalCols - 1, col + 1);
                break;
        }

        this.selectionManager.setAnchor(nextRow, nextCol);
        this._ensureCellIsVisible(nextRow, nextCol);
        this.requestDraw();
    }

    // Handles scrolling from the scrollbar manager.
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
        this.requestDraw();
    }

    // Creates an input element to allow editing of a cell's content.
    async _startEditing(row, col) {
        const { headerWidth, headerHeight } = this.options;
        const x =
            this.columnManager.getPosition(col, headerWidth) - this.scrollX + 1;
        const y =
            this.rowManager.getPosition(row, headerHeight) - this.scrollY + 1;
        const width = this.columnManager.getWidth(col) - 4;
        const height = this.rowManager.getHeight(row) - 2;
        const oldValue = (await this.cellManager.getCellValue(row, col)) || "";
        const input = document.createElement("input");
        input.type = "text";
        input.className = "cell-editor";
        input.value = oldValue;
        input.style.left = `${this.gridContainer.offsetLeft + x}px`;
        input.style.top = `${this.gridContainer.offsetTop + y}px`;
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
                        this.requestDraw();
                        this.onSelectionChange(this.selectionManager.selection);
                    }
                );
                this.commandManager.execute(command);
            }
            if (this.container.contains(input)) {
                this.container.removeChild(input);
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
        this.container.appendChild(input);
        input.focus();
        input.select();
    }

    // Handles changes in the selection and updates the status bar.
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

    // Calculates the total width of the grid content.
    getTotalContentWidth() {
        const effectiveCols = Math.min(
            this.options.totalCols,
            this.maxRenderedCol + 25
        );
        return this.columnManager.getPosition(
            effectiveCols,
            this.options.headerWidth
        );
    }

    // Calculates the total height of the grid content.
    getTotalContentHeight() {
        const effectiveRows = Math.min(
            this.options.totalRows,
            this.maxRenderedRow + 25
        );
        return this.rowManager.getPosition(
            effectiveRows,
            this.options.headerHeight
        );
    }

    // Gets the mouse position relative to the canvas.
    _getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    // Converts a column index to a letter-based label (A, B, C...).
    _getColLabel(colIndex) {
        let label = "",
            temp = colIndex;
        while (temp >= 0) {
            label = String.fromCharCode((temp % 26) + 65) + label;
            temp = Math.floor(temp / 26) - 1;
        }
        return label;
    }

    // Checks if the mouse is over a resize handle for a column or row.
    _getResizeHandle(x, y) {
        const { headerWidth, headerHeight } = this.options;
        const handleThreshold = 5;
        const visibleRange = this._getVisibleRange();

        if (y < headerHeight) {
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

    // Gets the column index at a given x-coordinate.
    _getColIndexAt(x) {
        return this.columnManager.getColIndexAt(
            x + this.scrollX,
            this.options.headerWidth
        );
    }

    // Gets the row index at a given y-coordinate.
    _getRowIndexAt(y) {
        return this.rowManager.getRowIndexAt(
            y + this.scrollY,
            this.options.headerHeight
        );
    }

    // Calculates the visible range of rows and columns based on the scroll position.
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
            endRow: Math.min(totalRows - 1, endRow + 5),
            startCol: Math.max(0, startCol),
            endCol: Math.min(totalCols - 1, endCol + 5),
        };
    }

    // Ensures that a given cell is visible in the viewport by scrolling if necessary.
    _ensureCellIsVisible(row, col) {
        const { headerWidth, headerHeight } = this.options;
        const viewWidth = this.canvas.clientWidth;
        const viewHeight = this.canvas.clientHeight;

        const x = this.columnManager.getPosition(col, headerWidth);
        const y = this.rowManager.getPosition(row, headerHeight);
        const w = this.columnManager.getWidth(col);
        const h = this.rowManager.getHeight(row);

        if (x + w > this.scrollX + viewWidth) {
            this.scrollX = x + w - viewWidth;
        }
        if (x < this.scrollX + headerWidth) {
            this.scrollX = x - headerWidth;
        }
        if (y + h > this.scrollY + viewHeight) {
            this.scrollY = y + h - viewHeight;
        }
        if (y < this.scrollY + headerHeight) {
            this.scrollY = y - headerHeight;
        }

        const maxScrollX = Math.max(0, this.getTotalContentWidth() - viewWidth);
        const maxScrollY = Math.max(
            0,
            this.getTotalContentHeight() - viewHeight
        );
        this.scrollX = Math.max(0, Math.min(this.scrollX, maxScrollX));
        this.scrollY = Math.max(0, Math.min(this.scrollY, maxScrollY));
    }
}
