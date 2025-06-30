import * as db from "./db.js";

export class CellManager {
    // Initializes the CellManager and its cache.
    constructor() {
        this.cache = new Map();
    }

    // Retrieves the value of a cell, first checking the cache and then falling back to the database.
    async getCellValue(row, col) {
        const id = `${row}:${col}`;
        if (this.cache.has(id)) {
            return this.cache.get(id);
        }

        const data = await db.getData(db.CELL_STORE, id);
        const value = data ? data.value : null;

        if (value) {
            this.cache.set(id, value);
        }

        return value;
    }

    // Sets the value of a cell, updating both the cache and the database.
    async setCellValue(row, col, value) {
        const id = `${row}:${col}`;
        this.cache.set(id, value);
        await db.setData(db.CELL_STORE, { id, value });
    }

    // Fetches the data for a range of cells, returning only non-empty values.
    async getCellRangeData(startCell, endCell) {
        const promises = [];
        for (let r = startCell.row; r <= endCell.row; r++) {
            for (let c = startCell.col; c <= endCell.col; c++) {
                promises.push(this.getCellValue(r, c));
            }
        }
        const values = await Promise.all(promises);
        return values.filter((v) => v !== null && v !== ""); // Return only non-empty values
    }

    // Retrieves the data for all visible cells, returning it as a Map for efficient lookup.
    async getVisibleCellData(range) {
        const { startRow, endRow, startCol, endCol } = range;
        const promises = [];
        const cellCoords = [];

        for (let r = startRow; r <= endRow; r++) {
            for (let c = startCol; c <= endCol; c++) {
                promises.push(this.getCellValue(r, c));
                cellCoords.push({ r, c });
            }
        }

        const values = await Promise.all(promises);
        const dataMap = new Map();

        values.forEach((value, index) => {
            if (value) {
                const { r, c } = cellCoords[index];
                dataMap.set(`${r}:${c}`, value);
            }
        });

        return dataMap;
    }
}