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
import { FormulaBar } from "./formulaBar.js";
import { ScrollBarManager } from "./scrollBarManager.js";

export class Grid {
    // Initializes the grid, sets up options, creates DOM elements, and initializes managers.
    constructor(container, options) {
        this.container = container;
        this.options = {
            totalRows: 50000,
            totalCols: 1000,
            defaultRowHeight: 23,
            defaultColWidth: 65,
            headerHeight: 30,
            headerWidth: 42,
            font: "14px Arial",
            ...options,
        };
        this.statusBar = options.statusBar; // Accept the statusBar instance

        this._createDOM();

        this.ctx = this.canvas.getContext("2d");
        this.dpr = window.devicePixelRatio || 1;
        this.scrollX = 0;
        this.scrollY = 0;
        this.interactionState = "none";
        this.interactionData = null;
        this.animationFrameId = null;
        this.autoScrollIntervalId = null; // For auto-scrolling during selection
        this.commandManager = new CommandManager();
        this.cellManager = new CellManager(this);
        this.columnManager = new ColumnManager({
            totalCols: this.options.totalCols,
            defaultWidth: this.options.defaultColWidth,
        });
        this.rowManager = new RowManager({
            totalRows: this.options.totalRows,
            defaultHeight: this.options.defaultRowHeight,
        });

        this.formulaBar = new FormulaBar(this.container, this);

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

    // Creates the necessary DOM elements for the grid.
    _createDOM() {
        this.gridContainer = document.createElement("div");
        this.gridContainer.id = "grid-container";

        this.canvas = document.createElement("canvas");
        this.canvas.id = "grid-canvas";
        this.canvas.tabIndex = 0;

        this.gridContainer.appendChild(this.canvas);
        this.container.appendChild(this.gridContainer);
    }

    // Requests an animation frame to draw the grid, preventing multiple draws in a single frame.
    requestDraw() {
        if (!this.animationFrameId) {
            this.animationFrameId = requestAnimationFrame(() => {
                this.draw();
                this.animationFrameId = null;
            });
        }
    }

    // Binds all necessary event listeners (pointer, keyboard, resize).
    _bindEvents() {
        window.addEventListener("resize", this.resizeCanvas.bind(this));
        this.canvas.addEventListener(
            "pointerdown",
            this._handlePointerDown.bind(this)
        );
        window.addEventListener(
            "pointermove",
            this._handleGlobalPointerMove.bind(this)
        );
        window.addEventListener(
            "pointerup",
            this._handleGlobalPointerUp.bind(this)
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
        this.canvas.width = Math.round(rect.width * this.dpr);
        this.canvas.height = Math.round(rect.height * this.dpr);
        this.requestDraw();
    }

    // The main drawing loop that renders the grid, headers, cells, and scrollbars.
    draw() {
        const currentDpr = window.devicePixelRatio || 1;
        if (currentDpr !== this.dpr) {
            this.resizeCanvas();
            return;
        }

        this.selectionManager.updateSelectionBoundsOnScroll();

        const viewWidth = this.canvas.clientWidth;
        const viewHeight = this.canvas.clientHeight;
        const { headerWidth, headerHeight } = this.options;

        const visibleRange = this._getVisibleRange();
        const visibleCellData =
            this.cellManager.getVisibleCellDataFromCache(visibleRange);

        this.ctx.save();
        this.ctx.scale(this.dpr, this.dpr);
        this.ctx.clearRect(0, 0, viewWidth, viewHeight);
        this.ctx.font = this.options.font;

        this._drawHeaders(visibleRange);

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(
            headerWidth,
            headerHeight,
            viewWidth - headerWidth,
            viewHeight - headerHeight
        );
        this.ctx.clip();

        // **FIX**: Draw data (and overflow backgrounds) BEFORE gridlines
        // This ensures gridlines are drawn on top of the white overflow background.
        this._drawGridLines(visibleRange);
        this._drawVisibleCellData(visibleRange, visibleCellData);

        this.selectionManager.drawContent(this.ctx, this.scrollX, this.scrollY);

        this.ctx.restore();

        this.selectionManager.drawHeaderHighlights(
            this.ctx,
            this.scrollX,
            this.scrollY
        );

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
        this.ctx.lineWidth = 1 / this.dpr;
        this.ctx.strokeStyle = "rgb(224, 224, 224)";
        this.ctx.beginPath();

        let currentX =
            this.columnManager.getPosition(startCol, headerWidth) -
            this.scrollX;
        for (let i = startCol; i <= endCol + 1; i++) {
            const x = (Math.floor(currentX * this.dpr) + 0.5) / this.dpr;
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
            const y = (Math.floor(currentY * this.dpr) + 0.5) / this.dpr;
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

    _drawHeaders(visibleRange) {
        const { startRow, endRow, startCol, endCol } = visibleRange;
        const { headerWidth, headerHeight, font } = this.options;
        const viewWidth = this.canvas.clientWidth;
        const viewHeight = this.canvas.clientHeight;
        const selection = this.selectionManager.selection;
        const selectionMode = this.selectionManager.selectionMode;

        // --- 1. Determine selection state ---
        const isFullColSelection =
            selection &&
            selection.type === "range" &&
            selectionMode === "col" &&
            selection.start.row === 0;
        const isFullRowSelection =
            selection &&
            selection.type === "range" &&
            selectionMode === "row" &&
            selection.start.col === 0;

        const getSelectedIndices = (axis) => {
            if (!selection) return {};
            const key = axis; // 'col' or 'row'
            if (selection.type === "cell") {
                return { [selection[key]]: true };
            }
            if (selection.type === "col" || selection.type === "row") {
                return { [selection[key]]: true };
            }
            if (selection.type === "range") {
                const indices = {};
                const start = selection.start[key];
                const end = selection.end[key];
                for (let i = start; i <= end; i++) {
                    indices[i] = true;
                }
                return indices;
            }
            return {};
        };
        const selectedCols = getSelectedIndices("col");
        const selectedRows = getSelectedIndices("row");

        // --- 2. Draw base header background ---
        this.ctx.fillStyle = "rgb(245, 245, 245)";
        this.ctx.fillRect(0, 0, viewWidth, headerHeight);
        this.ctx.fillRect(0, 0, headerWidth, viewHeight);

        // Draw the top-left corner box
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(headerWidth - 16, headerHeight - 4);
        this.ctx.lineTo(headerWidth - 3, headerHeight - 16);
        this.ctx.lineTo(headerWidth - 3, headerHeight - 4);
        this.ctx.closePath();
        this.ctx.fillStyle = "rgb(183,183,183)";
        this.ctx.fill();
        this.ctx.fillRect(0, headerHeight - 2, headerWidth, 2);
        this.ctx.fillRect(headerWidth - 1, 0, 1, headerHeight);
        this.ctx.restore();

        // --- 3. Draw special backgrounds for full selections ---
        this.ctx.save();
        this.ctx.fillStyle = "rgb(16,124,65)"; // Dark Green

        if (isFullColSelection) {
            let currentX =
                this.columnManager.getPosition(startCol, headerWidth) -
                this.scrollX;
            for (let i = startCol; i <= endCol; i++) {
                const colWidth = this.columnManager.getWidth(i);
                if (selectedCols[i]) {
                    this.ctx.fillRect(
                        currentX,
                        10,
                        colWidth,
                        headerHeight - 10
                    );
                }
                currentX += colWidth;
            }
        }
        if (isFullRowSelection) {
            let currentY =
                this.rowManager.getPosition(startRow, headerHeight) -
                this.scrollY;
            for (let i = startRow; i <= endRow; i++) {
                const rowHeight = this.rowManager.getHeight(i);
                if (selectedRows[i]) {
                    this.ctx.fillRect(0, currentY, headerWidth, rowHeight);
                }
                currentY += rowHeight;
            }
        }
        this.ctx.restore();

        // --- 4. Draw Header Text ---
        this.ctx.textBaseline = "middle";
        this.ctx.font = `semi-bold ${font}`;

        // Column Header Text
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
            const isSelected = selectedCols[i];

            if (isSelected && isFullColSelection) {
                this.ctx.fillStyle = "white";
            } else if (isSelected) {
                this.ctx.fillStyle = "rgb(16,124,65)";
            } else {
                this.ctx.fillStyle = "rgb(97, 97, 97)";
            }

            this.ctx.fillText(
                this._getColLabel(i),
                currentX + colWidth / 2,
                headerHeight - 9
            );
            currentX += colWidth;
        }
        this.ctx.restore();

        // Row Header Text
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(0, headerHeight, headerWidth, viewHeight - headerHeight);
        this.ctx.clip();
        this.ctx.textAlign = "right";
        let currentY =
            this.rowManager.getPosition(startRow, headerHeight) - this.scrollY;
        for (let i = startRow; i <= endRow; i++) {
            const rowHeight = this.rowManager.getHeight(i);
            const isSelected = selectedRows[i];

            if (isSelected && isFullRowSelection) {
                this.ctx.fillStyle = "white";
            } else if (isSelected) {
                this.ctx.fillStyle = "rgb(16,124,65)";
            } else {
                this.ctx.fillStyle = "rgb(97, 97, 97)";
            }

            this.ctx.fillText(i + 1, headerWidth - 5, currentY + rowHeight / 2);
            currentY += rowHeight;
        }
        this.ctx.restore();

        this.ctx.font = font;

        // --- 5. Draw Header Grid Lines ---
        this.ctx.save();
        this.ctx.lineWidth = 1 / this.dpr;
        this.ctx.strokeStyle = "#e0e0e0";
        this.ctx.beginPath();

        // Default grey lines
        currentX =
            this.columnManager.getPosition(startCol, headerWidth) -
            this.scrollX;
        for (let i = startCol; i <= endCol; i++) {
            const x = (Math.floor(currentX * this.dpr) + 0.5) / this.dpr;
            if (x >= headerWidth) {
                this.ctx.moveTo(x, 10);
                this.ctx.lineTo(x, headerHeight);
            }
            currentX += this.columnManager.getWidth(i);
        }
        currentY =
            this.rowManager.getPosition(startRow, headerHeight) - this.scrollY;
        for (let i = startRow; i <= endRow; i++) {
            const y = (Math.floor(currentY * this.dpr) + 0.5) / this.dpr;
            if (y >= headerHeight) {
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(headerWidth, y);
            }
            currentY += this.rowManager.getHeight(i);
        }
        this.ctx.stroke();

        // White separator lines for full selections
        this.ctx.strokeStyle = "white";
        this.ctx.beginPath();
        if (isFullColSelection) {
            currentX =
                this.columnManager.getPosition(startCol, headerWidth) -
                this.scrollX;
            for (let i = startCol; i < endCol; i++) {
                currentX += this.columnManager.getWidth(i);
                if (selectedCols[i] && selectedCols[i + 1]) {
                    const x =
                        (Math.floor(currentX * this.dpr) + 0.5) / this.dpr;
                    this.ctx.moveTo(x, 0);
                    this.ctx.lineTo(x, headerHeight);
                }
            }
        }
        if (isFullRowSelection) {
            currentY =
                this.rowManager.getPosition(startRow, headerHeight) -
                this.scrollY;
            for (let i = startRow; i < endRow; i++) {
                currentY += this.rowManager.getHeight(i);
                if (selectedRows[i] && selectedRows[i + 1]) {
                    const y =
                        (Math.floor(currentY * this.dpr) + 0.5) / this.dpr;
                    this.ctx.moveTo(0, y);
                    this.ctx.lineTo(headerWidth, y);
                }
            }
        }
        this.ctx.stroke();

        this.ctx.strokeStyle = "#ccc";
        this.ctx.beginPath();
        const headerHeightLine =
            (Math.floor(headerHeight * this.dpr) + 0.5) / this.dpr;
        const headerWidthLine =
            (Math.floor(headerWidth * this.dpr) + 0.5) / this.dpr;
        this.ctx.moveTo(headerWidthLine, 0);
        this.ctx.lineTo(headerWidthLine, viewHeight);
        this.ctx.stroke();

        this.ctx.restore();
    }

    // Draws the data for the visible cells.
    _drawVisibleCellData(visibleRange, visibleCellData) {
        const { startRow, endRow, startCol, endCol } = visibleRange;
        const { headerWidth, headerHeight } = this.options;
        this.ctx.textBaseline = "middle";

        const drawnOverCells = new Set();

        let y =
            this.rowManager.getPosition(startRow, headerHeight) - this.scrollY;
        for (let r = startRow; r <= endRow; r++) {
            const rowHeight = this.rowManager.getHeight(r);
            let x =
                this.columnManager.getPosition(startCol, headerWidth) -
                this.scrollX;

            for (let c = startCol; c <= endCol; c++) {
                const colWidth = this.columnManager.getWidth(c);
                const cellId = `${r}:${c}`;

                if (drawnOverCells.has(cellId)) {
                    x += colWidth;
                    continue;
                }

                const value = visibleCellData.get(cellId);
                if (value) {
                    const textMetrics = this.ctx.measureText(value);
                    const num = parseFloat(value);
                    const isNumber =
                        String(value).trim() !== "" &&
                        !isNaN(num) &&
                        isFinite(num);

                    // Check for text overflow
                    if (!isNumber && textMetrics.width > colWidth - 10) {
                        let availableWidth = 0;
                        let lastVisibleCol = c - 1;

                        // Look to find available space
                        for (let c2 = c; c2 <= endCol; c2++) {
                            const nextCellId = `${r}:${c2}`;
                            if (c2 > c && visibleCellData.has(nextCellId)) {
                                break;
                            }
                            availableWidth += this.columnManager.getWidth(c2);
                            lastVisibleCol = c2;
                            if (availableWidth > textMetrics.width + 5) {
                                break;
                            }
                        }

                        // Erase underlying content by drawing a white background.
                        this.ctx.fillStyle = "white";
                        this.ctx.fillRect(
                            x + 1,
                            y + 1,
                            availableWidth - 2,
                            rowHeight - 2
                        );

                        // Clip and draw text
                        this.ctx.save();
                        this.ctx.beginPath();
                        this.ctx.rect(x, y, availableWidth, rowHeight);
                        this.ctx.clip();
                        this.ctx.fillStyle = "#000";
                        this.ctx.textAlign = "left";
                        this.ctx.fillText(value, x + 5, y + rowHeight / 2);
                        this.ctx.restore();

                        // Mark the covered cells to be skipped
                        for (let c2 = c + 1; c2 <= lastVisibleCol; c2++) {
                            drawnOverCells.add(`${r}:${c2}`);
                        }
                    } else {
                        // No overflow or is a number, draw normally
                        this.ctx.save();
                        this.ctx.beginPath();
                        this.ctx.rect(x, y, colWidth, rowHeight);
                        this.ctx.clip();
                        this.ctx.fillStyle = "#000";

                        if (isNumber) {
                            this.ctx.textAlign = "right";
                            this.ctx.fillText(
                                value,
                                x + colWidth - 5,
                                y + rowHeight / 2
                            );
                        } else {
                            this.ctx.textAlign = "left";
                            this.ctx.fillText(value, x + 5, y + rowHeight / 2);
                        }
                        this.ctx.restore();
                    }
                }
                x += colWidth;
            }
            y += rowHeight;
        }
    }

    _handlePointerDown(e) {
        const { x, y } = this._getPointerPos(e);

        if (this.scrollBarManager.isPointerEventOnScrollBar(x, y)) {
            if (this.scrollBarManager.handlePointerDown(x, y)) {
                this.interactionState = "scrolling";
            }
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
                this.selectionManager.selectRow(rowIndex, e.shiftKey);
                this.interactionState = "selecting";
                this.interactionData = { lastPointerX: x, lastPointerY: y };
                this.requestDraw();
            }
        } else if (y < headerHeight && x > headerWidth) {
            const colIndex = this._getColIndexAt(x);
            if (colIndex !== -1) {
                this.selectionManager.selectCol(colIndex, e.shiftKey);
                this.interactionState = "selecting";
                this.interactionData = { lastPointerX: x, lastPointerY: y };
                this.requestDraw();
            }
        } else if (x < headerWidth && y < headerHeight) {
            this.selectionManager.selectAll();
            this.requestDraw();
        } else if (x > headerWidth && y > headerHeight) {
            const rowIndex = this._getRowIndexAt(y);
            const colIndex = this._getColIndexAt(x);
            if (rowIndex !== -1 && colIndex !== -1) {
                this.selectionManager.setAnchor(rowIndex, colIndex, e.shiftKey);
                this.interactionState = "selecting";
                this.interactionData = { lastPointerX: x, lastPointerY: y };
                this.requestDraw();
            }
        }
    }

    _handleGlobalPointerMove(e) {
        const { x, y } = this._getPointerPos(e);

        if (this.interactionState === "scrolling") {
            this.scrollBarManager.handlePointerMove(x, y);
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
            // this.requestDraw();
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
            // this.requestDraw();
        } else if (this.interactionState === "selecting") {
            if (this.interactionData) {
                this.interactionData.lastPointerX = x;
                this.interactionData.lastPointerY = y;
            }

            this._updateAutoScrollState(x, y);
            // dont return

            // allow mult rowcol select
            const rowIndex = this._getRowIndexAt(y);
            const colIndex = this._getColIndexAt(x);
            this.selectionManager.extendTo(rowIndex, colIndex);

            this.requestDraw();
        } else if (e.target === this.canvas) {
            this._handlePointerMove(e);
        }
    }

    _handlePointerMove(e) {
        if (this.interactionState !== "none") return;
        const { x, y } = this._getPointerPos(e);
        const resizeHandle = this._getResizeHandle(x, y);
        this.canvas.style.cursor = resizeHandle
            ? resizeHandle.type === "col"
                ? "col-resize"
                : "row-resize"
            : "default";
    }

    async _handleGlobalPointerUp(e) {
        this._stopAutoScroll();

        if (this.interactionState === "scrolling") {
            this.scrollBarManager.handlePointerUp();
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
        this.requestDraw();
    }

    _handleDoubleClick(e) {
        const { x, y } = this._getPointerPos(e);
        const { headerWidth, headerHeight } = this.options;
        if (x <= headerWidth || y <= headerHeight) return;
        const rowIndex = this._getRowIndexAt(y);
        const colIndex = this._getColIndexAt(x);
        if (rowIndex !== -1 && colIndex !== -1) {
            this._ensureCellIsVisible(rowIndex, colIndex);
            this._startEditing(rowIndex, colIndex);
        }
    }

    _handleWheel(e) {
        e.preventDefault();
        this._onScrollBarScroll(e.deltaX, e.deltaY);
    }

    _handleKeyDown(e) {
        const selection = this.selectionManager.selection;

        if (
            document.activeElement === this.formulaBar.formulaInput ||
            document.activeElement === this.formulaBar.nameBox
        ) {
            return;
        }

        if (
            selection &&
            e.key.length === 1 &&
            !e.ctrlKey &&
            !e.altKey &&
            !e.metaKey
        ) {
            const activeCell = this.selectionManager.getActiveCell();
            if (activeCell) {
                this._ensureCellIsVisible(activeCell.row, activeCell.col);
                this._startEditing(activeCell.row, activeCell.col, e.key);
                return;
            }
        }

        const movementKeys = [
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
            "Tab",
        ];
        if (!movementKeys.includes(e.key)) return;
        if (!selection) return;

        e.preventDefault();

        if (e.key === "Tab" && selection.type === "range") {
            let { row, col } = this.selectionManager.getActiveCell();
            const { start, end } = selection;

            if (e.shiftKey) {
                col--;
                if (col < start.col) {
                    col = end.col;
                    row--;
                    if (row < start.row) {
                        row = end.row;
                    }
                }
            } else {
                col++;
                if (col > end.col) {
                    col = start.col;
                    row++;
                    if (row > end.row) {
                        row = start.row;
                    }
                }
            }
            this.selectionManager.moveAnchor(row, col);
            this._ensureCellIsVisible(row, col);
            this.requestDraw();
            return;
        }

        let moveFromCell;
        if (e.shiftKey) {
            moveFromCell = this.selectionManager.getFocusCell();
        } else {
            moveFromCell = this.selectionManager.getActiveCell();
        }

        let nextRow = moveFromCell.row;
        let nextCol = moveFromCell.col;

        switch (e.key) {
            case "ArrowUp":
                nextRow = Math.max(0, nextRow - 1);
                break;
            case "ArrowDown":
                nextRow = Math.min(this.options.totalRows - 1, nextRow + 1);
                break;
            case "ArrowLeft":
                nextCol = Math.max(0, nextCol - 1);
                break;
            case "ArrowRight":
                nextCol = Math.min(this.options.totalCols - 1, nextCol + 1);
                break;
            case "Tab":
                if (e.shiftKey) {
                    nextCol = Math.max(0, nextCol - 1);
                } else {
                    nextCol = Math.min(this.options.totalCols - 1, nextCol + 1);
                }
                break;
        }

        if (e.shiftKey) {
            this.selectionManager.extendTo(nextRow, nextCol);
        } else {
            this.selectionManager.setAnchor(nextRow, nextCol);
        }

        this._ensureCellIsVisible(nextRow, nextCol);
        this.requestDraw();
    }

    _updateAutoScrollState(x, y) {
        const { headerWidth, headerHeight } = this.options;
        const viewWidth = this.canvas.clientWidth;
        const viewHeight = this.canvas.clientHeight;
        const hotZone = 30;
        const maxSpeed = 20;

        let scrollSpeedX = 0;
        let scrollSpeedY = 0;

        if (x > viewWidth - hotZone) {
            scrollSpeedX = maxSpeed * ((x - (viewWidth - hotZone)) / hotZone);
        }
        if (x < headerWidth + hotZone) {
            scrollSpeedX = -maxSpeed * ((headerWidth + hotZone - x) / hotZone);
        }
        if (y > viewHeight - hotZone) {
            scrollSpeedY = maxSpeed * ((y - (viewHeight - hotZone)) / hotZone);
        }
        if (y < headerHeight + hotZone) {
            scrollSpeedY = -maxSpeed * ((headerHeight + hotZone - y) / hotZone);
        }

        if (scrollSpeedX !== 0 || scrollSpeedY !== 0) {
            if (this.interactionData) {
                this.interactionData.scrollSpeed = {
                    x: scrollSpeedX,
                    y: scrollSpeedY,
                };
            }
            this._startAutoScroll();
        } else {
            this._stopAutoScroll();
        }
    }

    _startAutoScroll() {
        if (this.autoScrollIntervalId) return;

        this.autoScrollIntervalId = setInterval(() => {
            if (!this.interactionData || !this.interactionData.scrollSpeed) {
                this._stopAutoScroll();
                return;
            }

            const { x: speedX, y: speedY } = this.interactionData.scrollSpeed;
            this._onScrollBarScroll(speedX, speedY);

            const { lastPointerX, lastPointerY } = this.interactionData;
            const rowIndex = this._getRowIndexAt(lastPointerY);
            const colIndex = this._getColIndexAt(lastPointerX);

            this.selectionManager.extendTo(rowIndex, colIndex);
        }, 16);
    }

    _stopAutoScroll() {
        if (this.autoScrollIntervalId) {
            clearInterval(this.autoScrollIntervalId);
            this.autoScrollIntervalId = null;
        }
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
        this.requestDraw();
    }

    // Creates an input element to allow editing of a cell's content.
    async _startEditing(row, col, initialValue = null) {
        if (document.activeElement === this.formulaBar.formulaInput) return;

        const { headerWidth, headerHeight } = this.options;
        const x =
            this.columnManager.getPosition(col, headerWidth) - this.scrollX;
        const y = this.rowManager.getPosition(row, headerHeight) - this.scrollY;
        const width = this.columnManager.getWidth(col);
        const height = this.rowManager.getHeight(row);
        const oldValue = (await this.cellManager.getCellValue(row, col)) || "";

        const editor = document.createElement("textarea");
        editor.className = "cell-editor";
        editor.value = initialValue !== null ? initialValue : oldValue;

        const helper = document.createElement("span");
        helper.className = "cell-editor";
        helper.style.position = "absolute";
        helper.style.left = "-9999px";
        helper.style.top = "-9999px";
        // prevent wrapping to get exact width
        helper.style.whiteSpace = "pre"; // dont let it wrap since width metric is needed

        this.gridContainer.appendChild(helper);

        const finishEditing = () => {
            if (!this.gridContainer.contains(editor)) return;
            // Also remove the helper element to clean up the DOM
            this.gridContainer.removeChild(helper);
            const newValue = editor.value;
            this.commitCellEdit(row, col, oldValue, newValue);
            this.gridContainer.removeChild(editor);
            this.canvas.focus();
        };

        const updateEditorSize = () => {
            // calc the max width the editor can expand to.
            // limited by the next non-empty cell or the viewport edge.
            const visibleRange = this._getVisibleRange();
            let maxAllowedWidth = this.columnManager.getWidth(col);
            let viewportWidth = this.gridContainer.clientWidth;
            // Account for the vertical scrollbar if it's visible.
            if (this.scrollBarManager.vThumb) {
                viewportWidth -= this.scrollBarManager.size;
            }

            for (let c2 = col + 1; c2 <= visibleRange.endCol + 1; c2++) {
                if (this.cellManager.cache.get(`${row}:${c2}`)) break;

                const nextWidth = this.columnManager.getWidth(c2);
                // Check if adding the next cell exceeds the viewport boundary.
                if (x + maxAllowedWidth + nextWidth > viewportWidth) {
                    maxAllowedWidth = viewportWidth - x;
                    break;
                }
                maxAllowedWidth += nextWidth;
            }

            // Measure the text's actual required width using the stable helper.
            helper.textContent = editor.value;
            const requiredContentWidth = helper.offsetWidth;

            // set the final editor width.
            const baseWidth = this.columnManager.getWidth(col);
            const newWidth = Math.min(
                Math.max(baseWidth, requiredContentWidth + 10), // 10 just for padding
                maxAllowedWidth
            );
            editor.style.width = `${newWidth}px`;

            // noice add a small buffer to prevent the textarea's own scrollbar from appearing.
            editor.style.height = `${editor.scrollHeight + 2}px`;
        };

        editor.style.left = `${x - 1}px`;
        editor.style.top = `${y - 1}px`;
        editor.style.width = `${width + 2}px`;
        editor.style.height = `${height + 2}px`;

        editor.addEventListener("blur", finishEditing);
        editor.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                finishEditing();
            } else if (e.key === "Escape") {
                e.preventDefault();
                editor.value = oldValue;
                finishEditing();
            } else if (e.key === "Tab") {
                e.preventDefault();
                finishEditing();
                this._handleKeyDown(e);
            }
        });

        editor.addEventListener("input", () => {
            this.formulaBar.formulaInput.value = editor.value;
            updateEditorSize();
        });

        this.gridContainer.appendChild(editor);
        editor.focus();
        if (initialValue !== null) {
            editor.select();
        } else {
            editor.setSelectionRange(editor.value.length, editor.value.length);
        }

        // on start to ensure correct initial size.
        updateEditorSize();

        this.formulaBar.formulaInput.value = editor.value;
        this.formulaBar.originalValue = oldValue;
    }

    commitCellEdit(row, col, oldValue, newValue) {
        if (newValue === oldValue) return;

        const command = new EditCellCommand(
            this.cellManager,
            row,
            col,
            oldValue,
            newValue,
            () => {
                this.requestDraw();
                const activeCell = this.selectionManager.getActiveCell();
                if (
                    activeCell &&
                    activeCell.row === row &&
                    activeCell.col === col
                ) {
                    this.onSelectionChange(this.selectionManager.selection);
                }
            }
        );
        this.commandManager.execute(command);
    }

    async onSelectionChange(selection) {
        await this.formulaBar.updateSelection(selection);

        if (this.statusBar) {
            if (!selection) {
                this.statusBar.clear();
                return;
            }

            let startCell, endCell;
            switch (selection.type) {
                case "cell":
                    startCell = { row: selection.row, col: selection.col };
                    endCell = startCell;
                    break;
                case "range":
                    startCell = selection.start;
                    endCell = selection.end;
                    break;
                default:
                    this.statusBar.clear();
                    return;
            }

            const values = await this.cellManager.getCellRangeData(
                startCell,
                endCell
            );
            this.statusBar.update(values);
        }
    }

    // --- Utility and Helper Functions ---
    // All functions below here are unchanged.

    getEffectiveMaxRow() {
        const visibleRange = this._getVisibleRange();
        return Math.max(this.cellManager.maxEditedRow, visibleRange.endRow);
    }

    getEffectiveMaxCol() {
        const visibleRange = this._getVisibleRange();
        return Math.max(this.cellManager.maxEditedCol, visibleRange.endCol);
    }

    getTotalContentWidth() {
        const visibleRange = this._getVisibleRange();
        const effectiveCols = Math.min(
            this.options.totalCols,
            Math.max(visibleRange.endCol, this.cellManager.maxEditedCol) + 10
        );
        return this.columnManager.getPosition(
            effectiveCols,
            this.options.headerWidth
        );
    }

    getTotalContentHeight() {
        const visibleRange = this._getVisibleRange();
        const effectiveRows = Math.min(
            this.options.totalRows,
            Math.max(visibleRange.endRow, this.cellManager.maxEditedRow) + 10
        );
        return this.rowManager.getPosition(
            effectiveRows,
            this.options.headerHeight
        );
    }

    _getPointerPos(e) {
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

    getCellAddress(row, col) {
        return `${this._getColLabel(col)}${row + 1}`;
    }

    parseCellAddress(address) {
        if (typeof address !== "string" || !address) {
            return null;
        }

        const match = address.match(/^([a-zA-Z]+)(\d+)$/);
        if (!match) {
            return null;
        }

        const colStr = match[1].toUpperCase();
        const rowStr = match[2];

        let col = 0;
        for (let i = 0; i < colStr.length; i++) {
            col = col * 26 + (colStr.charCodeAt(i) - 64);
        }
        col -= 1; // Convert to 0-based index

        const row = parseInt(rowStr, 10) - 1; // Convert to 0-based index

        if (
            isNaN(row) ||
            isNaN(col) ||
            row < 0 ||
            col < 0 ||
            row >= this.options.totalRows ||
            col >= this.options.totalCols
        ) {
            return null;
        }

        return { row, col };
    }

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
            endRow: Math.min(totalRows - 1, endRow + 5),
            startCol: Math.max(0, startCol),
            endCol: Math.min(totalCols - 1, endCol + 5),
        };
    }

    _ensureCellIsVisible(row, col) {
        const { headerWidth, headerHeight } = this.options;
        const viewWidth = this.canvas.clientWidth;
        const viewHeight = this.canvas.clientHeight;

        const x = this.columnManager.getPosition(col, headerWidth);
        const y = this.rowManager.getPosition(row, headerHeight);
        const w = this.columnManager.getWidth(col);
        const h = this.rowManager.getHeight(row);

        const contentRight =
            this.scrollX +
            viewWidth -
            (this.scrollBarManager.vThumb ? this.scrollBarManager.size : 0);
        const contentBottom =
            this.scrollY +
            viewHeight -
            (this.scrollBarManager.hThumb ? this.scrollBarManager.size : 0);

        if (x < this.scrollX + headerWidth) {
            this.scrollX = x - headerWidth;
        } else if (x + w > contentRight) {
            this.scrollX =
                x +
                w -
                viewWidth +
                (this.scrollBarManager.vThumb ? this.scrollBarManager.size : 0);
        }

        if (y < this.scrollY + headerHeight) {
            this.scrollY = y - headerHeight;
        } else if (y + h > contentBottom) {
            this.scrollY =
                y +
                h -
                viewHeight +
                (this.scrollBarManager.hThumb ? this.scrollBarManager.size : 0);
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
