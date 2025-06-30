import * as db from "./db.js";

export class RowManager {
    // Initializes the RowManager with settings for total rows and default height.
    constructor(options) {
        this.totalRows = options.totalRows;
        this.defaultHeight = options.defaultHeight;
        this.customHeights = new Map();
        this.positionCache = new Map();
    }

    // Loads custom row heights from the database.
    async loadHeights() {
        const heights = await db.getAllData(db.ROW_HEIGHT_STORE);
        heights.forEach((item) => {
            this.customHeights.set(item.id, item.height);
        });
        this.positionCache.clear();
    }

    // Gets the height of a specific row, using custom height if available, otherwise default.
    getHeight(rowIndex) {
        return this.customHeights.get(rowIndex) || this.defaultHeight;
    }

    // Sets the height of a row and saves it to the database.
    async setHeight(rowIndex, height) {
        this.customHeights.set(rowIndex, height);
        this.positionCache.clear();
        await db.setData(db.ROW_HEIGHT_STORE, { id: rowIndex, height: height });
    }

    // Calculates the vertical position of a row, using a cache for performance.
    getPosition(rowIndex, headerHeight) {
        if (this.positionCache.has(rowIndex)) {
            return this.positionCache.get(rowIndex);
        }

        let y = headerHeight + rowIndex * this.defaultHeight;

        for (const [index, height] of this.customHeights.entries()) {
            if (index < rowIndex) {
                y += height - this.defaultHeight;
            }
        }

        this.positionCache.set(rowIndex, y);
        return y;
    }

    // Determines the row index at a given vertical position.
    // This is important for hit-testing, like figuring out which row was clicked.
    getRowIndexAt(y, headerHeight) {
        if (y < headerHeight) return -1;

        const contentY = y - headerHeight;

        let estimatedIndex = Math.floor(contentY / this.defaultHeight);
        estimatedIndex = Math.max(
            0,
            Math.min(estimatedIndex, this.totalRows - 1)
        );

        let estimatedPos = estimatedIndex * this.defaultHeight;
        for (const [index, height] of this.customHeights.entries()) {
            if (index < estimatedIndex) {
                estimatedPos += height - this.defaultHeight;
            }
        }

        if (estimatedPos > contentY) {
            while (estimatedPos > contentY && estimatedIndex > 0) {
                estimatedIndex--;
                estimatedPos -= this.getHeight(estimatedIndex);
            }
        } else {
            let currentPosWithHeight =
                estimatedPos + this.getHeight(estimatedIndex);
            while (
                currentPosWithHeight < contentY &&
                estimatedIndex < this.totalRows - 1
            ) {
                estimatedPos = currentPosWithHeight;
                estimatedIndex++;
                currentPosWithHeight += this.getHeight(estimatedIndex);
            }
        }

        return estimatedIndex;
    }
}