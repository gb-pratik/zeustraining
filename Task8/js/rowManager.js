import * as db from "./db.js";

export class RowManager {
    constructor(options) {
        this.totalRows = options.totalRows;
        this.defaultHeight = options.defaultHeight;
        this.customHeights = new Map();
        this.positionCache = new Map();
    }

    async loadHeights() {
        const heights = await db.getAllData(db.ROW_HEIGHT_STORE);
        heights.forEach((item) => {
            this.customHeights.set(item.id, item.height);
        });
        this.positionCache.clear();
    }

    getHeight(rowIndex) {
        return this.customHeights.get(rowIndex) || this.defaultHeight;
    }

    async setHeight(rowIndex, height) {
        this.customHeights.set(rowIndex, height);
        this.positionCache.clear();
        await db.setData(db.ROW_HEIGHT_STORE, { id: rowIndex, height: height });
    }

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
