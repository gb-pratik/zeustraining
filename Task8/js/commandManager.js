export class CommandManager {
    // Initializes the CommandManager with undo and redo stacks.
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
    }

    // Executes a command, adds it to the undo stack, and clears the redo stack.
    execute(command) {
        command.execute();
        this.undoStack.push(command);
        this.redoStack = [];
    }

    // Undoes the most recent command.
    undo() {
        if (this.undoStack.length === 0) {
            console.log("Nothing to undo.");
            return;
        }
        const command = this.undoStack.pop();
        command.undo();
        this.redoStack.push(command);
    }

    // Redoes the most recently undone command.
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

// Command for editing a cell's value.
export class EditCellCommand {
    constructor(cellManager, row, col, oldValue, newValue, onComplete) {
        this.cellManager = cellManager;
        this.row = row;
        this.col = col;
        this.oldValue = oldValue;
        this.newValue = newValue;
        this.onComplete = onComplete;
    }

    // Executes the cell edit.
    async execute() {
        console.log("Yo");
        await this.cellManager.setCellValue(this.row, this.col, this.newValue);
        this.onComplete();
    }

    // Undoes the cell edit.
    async undo() {
        console.log("Yo");
        await this.cellManager.setCellValue(this.row, this.col, this.oldValue);
        this.onComplete();
    }
}

// Command for resizing a column.
export class ResizeColCommand {
    constructor(columnManager, colIndex, oldWidth, newWidth, onComplete) {
        this.columnManager = columnManager;
        this.colIndex = colIndex;
        this.oldWidth = oldWidth;
        this.newWidth = newWidth;
        this.onComplete = onComplete;
    }

    // Executes the column resize.
    async execute() {
        await this.columnManager.setWidth(this.colIndex, this.newWidth);
        this.onComplete();
    }

    // Undoes the column resize.
    async undo() {
        await this.columnManager.setWidth(this.colIndex, this.oldWidth);
        this.onComplete();
    }
}

// Command for resizing a row.
export class ResizeRowCommand {
    constructor(rowManager, rowIndex, oldHeight, newHeight, onComplete) {
        this.rowManager = rowManager;
        this.rowIndex = rowIndex;
        this.oldHeight = oldHeight;
        this.newHeight = newHeight;
        this.onComplete = onComplete;
    }

    // Executes the row resize.
    async execute() {
        await this.rowManager.setHeight(this.rowIndex, this.newHeight);
        this.onComplete();
    }

    // Undoes the row resize.
    async undo() {
        await this.rowManager.setHeight(this.rowIndex, this.oldHeight);
        this.onComplete();
    }
}
