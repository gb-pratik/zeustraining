import * as db from "./db.js";

export class CellManager {
    constructor() {
        this.cache = new Map();
    }

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

    async setCellValue(row, col, value) {
        const id = `${row}:${col}`;
        this.cache.set(id, value);
        await db.setData(db.CELL_STORE, { id, value });
    }

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
