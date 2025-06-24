import * as db from "./db.js";

export class ColumnManager {
    constructor(options) {
        this.totalCols = options.totalCols;
        this.defaultWidth = options.defaultWidth;
        this.customWidths = new Map();
        this.positionCache = new Map();
    }

    async loadWidths() {
        const widths = await db.getAllData(db.COL_WIDTH_STORE);
        widths.forEach((item) => {
            this.customWidths.set(item.id, item.width);
        });
        this.positionCache.clear();
    }

    getWidth(colIndex) {
        return this.customWidths.get(colIndex) || this.defaultWidth;
    }

    async setWidth(colIndex, width) {
        this.customWidths.set(colIndex, width);
        this.positionCache.clear();
        await db.setData(db.COL_WIDTH_STORE, { id: colIndex, width: width });
    }

    getPosition(colIndex, headerWidth) {
        if (this.positionCache.has(colIndex)) {
            return this.positionCache.get(colIndex);
        }

        let x = headerWidth + colIndex * this.defaultWidth;

        for (const [index, width] of this.customWidths.entries()) {
            if (index < colIndex) {
                x += width - this.defaultWidth;
            }
        }

        this.positionCache.set(colIndex, x);
        return x;
    }

    getColIndexAt(x, headerWidth) {
        if (x < headerWidth) return -1;

        const contentX = x - headerWidth;

        let estimatedIndex = Math.floor(contentX / this.defaultWidth);
        estimatedIndex = Math.max(
            0,
            Math.min(estimatedIndex, this.totalCols - 1)
        );

        let estimatedPos = estimatedIndex * this.defaultWidth;
        for (const [index, width] of this.customWidths.entries()) {
            if (index < estimatedIndex) {
                estimatedPos += width - this.defaultWidth;
            }
        }

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
