import * as db from "./db.js";

export class CellManager {
    // Initializes the CellManager and its cache.
    constructor() {
        this.cache = new Map();
        this.pendingFetches = new Set();
        this.maxEditedRow = 100;
        this.maxEditedCol = 100;
    }

    // Retrieves the value of a cell, checking the cache and then falling back to the database.
    // Caches null results to prevent re-fetching empty cells.
    async getCellValue(row, col) {
        const id = `${row}:${col}`;
        if (this.cache.has(id)) {
            return this.cache.get(id);
        }

        const data = await db.getData(db.CELL_STORE, id);
        const value = data ? data.value : null;

        this.cache.set(id, value); // Cache the result, even if it's null
        return value;
    }

    // Sets the value of a cell, updating both the cache and the database.
    async setCellValue(row, col, value) {
        const id = `${row}:${col}`;
        this.cache.set(id, value);
        await db.setData(db.CELL_STORE, { id, value });
        this.updateMaxEditedCell(row, col);
    }

    async getCellRangeData(startCell, endCell) {
        const idsToFetch = [];
        const cachedValues = [];

        // First, collect all values from cache and identify what needs fetching.
        for (let r = startCell.row; r <= endCell.row; r++) {
            for (let c = startCell.col; c <= endCell.col; c++) {
                const id = `${r}:${c}`;
                if (this.cache.has(id)) {
                    const val = this.cache.get(id);
                    if (val !== null && val !== "") {
                        cachedValues.push(val);
                    }
                } else {
                    idsToFetch.push(id);
                }
            }
        }

        if (idsToFetch.length === 0) {
            return cachedValues;
        }

        // Fetch the remaining data from DB
        const fetchedData = await db.getMultipleData(db.CELL_STORE, idsToFetch);

        // Cache the new results
        const resultMap = new Map(
            fetchedData.map((item) => [item.id, item.value])
        );
        for (const id of idsToFetch) {
            const value = resultMap.get(id) || null;
            this.cache.set(id, value);
        }

        const fetchedValues = fetchedData
            .map((d) => d.value)
            .filter((v) => v !== null && v !== "");

        return [...cachedValues, ...fetchedValues];
    }

    // Synchronously gets all cached data for a given range. Used by the render loop.
    getVisibleCellDataFromCache(range) {
        const { startRow, endRow, startCol, endCol } = range;
        const dataMap = new Map();

        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                const id = `${r}:${c}`;
                const value = this.cache.get(id);
                if (value) {
                    // Only include non-empty values
                    dataMap.set(id, value);
                }
            }
        }
        return dataMap;
    }

    async prefetchVisibleCellData(range) {
        const fetchKey = `${range.startRow}:${range.startCol}-${range.endRow}:${range.endCol}`;
        if (this.pendingFetches.has(fetchKey)) {
            return false; // Already fetching this range
        }

        const idsToFetch = [];
        for (let r = range.startRow; r <= range.endRow; r++) {
            for (let c = range.startCol; c <= range.endCol; c++) {
                const id = `${r}:${c}`;
                if (!this.cache.has(id)) {
                    idsToFetch.push(id);
                }
            }
        }

        if (idsToFetch.length === 0) {
            return false; // All data is already cached
        }

        this.pendingFetches.add(fetchKey);

        try {
            const results = await db.getMultipleData(db.CELL_STORE, idsToFetch);
            const resultMap = new Map(
                results.map((item) => [item.id, item.value])
            );

            let newDataLoaded = false;
            for (const id of idsToFetch) {
                const value = resultMap.get(id) || null; // If not in results, it's null
                if (!this.cache.has(id)) {
                    this.cache.set(id, value);
                    if (value) newDataLoaded = true;
                }
            }
            return newDataLoaded;
        } finally {
            this.pendingFetches.delete(fetchKey);
        }
    }

    // Updates the maximum edited row and column.
    updateMaxEditedCell(row, col) {
        let updated = false;
        if (row > this.maxEditedRow) {
            this.maxEditedRow = row;
            updated = true;
        }
        if (col > this.maxEditedCol) {
            this.maxEditedCol = col;
            updated = true;
        }
        if (updated) {
            this.saveMaxEditedCell();
        }
    }

    // Saves the maximum edited cell to the database.
    async saveMaxEditedCell() {
        await db.setData(db.MAX_EDITED_CELL_STORE, {
            id: "maxEdited",
            row: this.maxEditedRow,
            col: this.maxEditedCol,
        });
    }

    // Loads the maximum edited cell from the database.
    async loadMaxEditedCell() {
        const data = await db.getData(db.MAX_EDITED_CELL_STORE, "maxEdited");
        if (data) {
            this.maxEditedRow = data.row || 0;
            this.maxEditedCol = data.col || 0;
        }
    }
}
("");
