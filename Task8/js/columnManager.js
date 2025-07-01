import * as db from "./db.js";

export class ColumnManager {
    // Initializes the ColumnManager with settings for total columns and default width.
    constructor(options) {
        this.totalCols = options.totalCols;
        this.defaultWidth = options.defaultWidth;
        this.customWidths = new Map();
        this.positionCache = new Map();
        this.sortedCustomWidths = null;
    }

    // Loads custom column widths from the database.
    async loadWidths() {
        const widths = await db.getAllData(db.COL_WIDTH_STORE);
        widths.forEach((item) => {
            this.customWidths.set(item.id, item.width);
        });
        this.positionCache.clear();
        this.sortedCustomWidths = null;
    }

    // Gets the width of a specific column, using custom width if available, otherwise default.
    getWidth(colIndex) {
        return this.customWidths.get(colIndex) || this.defaultWidth;
    }

    // Sets the width of a column and saves it to the database.
    async setWidth(colIndex, width) {
        this.customWidths.set(colIndex, width);
        this.positionCache.clear();
        this.sortedCustomWidths = null;
        await db.setData(db.COL_WIDTH_STORE, { id: colIndex, width: width });
    }

    // Helper to ensure custom widths are sorted by index for efficient iteration.
    _ensureSortedWidths() {
        if (this.sortedCustomWidths === null) {
            this.sortedCustomWidths = [...this.customWidths.entries()].sort(
                (a, b) => a[0] - b[0]
            );
        }
    }

    // Calculates the horizontal position of a column, using a cache for performance.
    getPosition(colIndex, headerWidth) {
        if (this.positionCache.has(colIndex)) {
            return this.positionCache.get(colIndex);
        }

        let x = headerWidth + colIndex * this.defaultWidth;

        this._ensureSortedWidths();
        for (const [index, width] of this.sortedCustomWidths) {
            if (index < colIndex) {
                x += width - this.defaultWidth;
            } else {
                // Since the list is sorted, we can stop iterating early.
                break;
            }
        }

        this.positionCache.set(colIndex, x);
        return x;
    }

    // Determines the column index at a given horizontal position.
    // This is important for hit-testing, like figuring out which column was clicked.
    getColIndexAt(x, headerWidth) {
        if (x < headerWidth) return -1;

        const contentX = x - headerWidth;

        let estimatedIndex = Math.floor(contentX / this.defaultWidth);
        estimatedIndex = Math.max(
            0,
            Math.min(estimatedIndex, this.totalCols - 1)
        );

        let estimatedPos =
            this.getPosition(estimatedIndex, headerWidth) - headerWidth;

        if (estimatedPos > contentX) {
            while (estimatedPos > contentX && estimatedIndex > 0) {
                estimatedIndex--;
                estimatedPos -= this.getWidth(estimatedIndex);
            }
        } else {
            let currentPosWithWidth =
                estimatedPos + this.getWidth(estimatedIndex);
            while (
                currentPosWithWidth < contentX &&
                estimatedIndex < this.totalCols - 1
            ) {
                estimatedPos = currentPosWithWidth;
                estimatedIndex++;
                currentPosWithWidth += this.getWidth(estimatedIndex);
            }
        }
        return estimatedIndex;
    }
}
