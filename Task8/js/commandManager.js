export class CommandManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
    }

    execute(command) {
        command.execute();
        this.undoStack.push(command);
        this.redoStack = [];
    }

    undo() {
        if (this.undoStack.length === 0) {
            console.log("Nothing to undo.");
            return;
        }
        const command = this.undoStack.pop();
        command.undo();
        this.redoStack.push(command);
    }

    redo() {
        if (this.redoStack.length === 0) {
            console.log("Nothing to redo.");
            return;
        }
        const command = this.redoStack.pop();
        command.execute();
        this.undoStack.push(command);
    }
}

export class EditCellCommand {
    constructor(cellManager, row, col, oldValue, newValue, onComplete) {
        this.cellManager = cellManager;
        this.row = row;
        this.col = col;
        this.oldValue = oldValue;
        this.newValue = newValue;
        this.onComplete = onComplete;
    }

    async execute() {
        await this.cellManager.setCellValue(this.row, this.col, this.newValue);
        this.onComplete();
    }

    async undo() {
        await this.cellManager.setCellValue(this.row, this.col, this.oldValue);
        this.onComplete();
    }
}

export class ResizeColCommand {
    constructor(columnManager, colIndex, oldWidth, newWidth, onComplete) {
        this.columnManager = columnManager;
        this.colIndex = colIndex;
        this.oldWidth = oldWidth;
        this.newWidth = newWidth;
        this.onComplete = onComplete;
    }

    async execute() {
        await this.columnManager.setWidth(this.colIndex, this.newWidth);
        this.onComplete();
    }

    async undo() {
        await this.columnManager.setWidth(this.colIndex, this.oldWidth);
        this.onComplete();
    }
}

export class ResizeRowCommand {
    constructor(rowManager, rowIndex, oldHeight, newHeight, onComplete) {
        this.rowManager = rowManager;
        this.rowIndex = rowIndex;
        this.oldHeight = oldHeight;
        this.newHeight = newHeight;
        this.onComplete = onComplete;
    }

    async execute() {
        await this.rowManager.setHeight(this.rowIndex, this.newHeight);
        this.onComplete();
    }

    async undo() {
        await this.rowManager.setHeight(this.rowIndex, this.oldHeight);
        this.onComplete();
    }
}
