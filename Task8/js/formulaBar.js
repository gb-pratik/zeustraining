export class FormulaBar {
    constructor(container, grid) {
        this.container = container;
        this.grid = grid;
        this.activeCell = null;
        this.originalValue = "";

        this._createDOM();
        this._bindEvents();
    }

    _createDOM() {
        this.element = document.createElement("div");
        this.element.id = "formula-bar";

        this.nameBox = document.createElement("input");
        this.nameBox.type = "text";
        this.nameBox.className = "name-box";

        // This section contains the formula-related buttons
        this.formulaSection = document.createElement("div");
        this.formulaSection.className = "formula-section";

        this.cancelButton = document.createElement("button");
        this.cancelButton.className = "formula-btn cancel-btn";
        // this.cancelButton.innerHTML = "×"; // "X" symbol
        this.cancelButton.title = "Cancel";

        this.confirmButton = document.createElement("button");
        this.confirmButton.className = "formula-btn confirm-btn";
        // this.confirmButton.innerHTML = "✓"; // "✓" symbol
        this.confirmButton.title = "Confirm";

        this.fxButton = document.createElement("button");
        this.fxButton.className = "formula-btn fx-btn";
        // this.fxButton.innerHTML = "fx";
        this.fxButton.title = "Insert Function";

        this.formulaSection.appendChild(this.cancelButton);
        this.formulaSection.appendChild(this.confirmButton);
        this.formulaSection.appendChild(this.fxButton);

        this.formulaInput = document.createElement("input");
        this.formulaInput.type = "text";
        this.formulaInput.className = "formula-input";

        this.element.appendChild(this.nameBox);
        this.element.appendChild(this.formulaSection);
        this.element.appendChild(this.formulaInput);

        this.container.prepend(this.element);
    }

    _bindEvents() {
        this.formulaInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                this._commitChange();
                this.grid.canvas.focus();
                this.grid._handleKeyDown({
                    ...e,
                    key: "ArrowDown",
                    preventDefault: () => {},
                });
            } else if (e.key === "Escape") {
                e.preventDefault();
                this._cancelChange();
                this.grid.canvas.focus();
            }
        });

        this.cancelButton.addEventListener("click", () => {
            this._cancelChange();
            this.grid.canvas.focus();
        });

        this.confirmButton.addEventListener("click", () => {
            this._commitChange();
            this.grid.canvas.focus();
        });

        this.fxButton.addEventListener("click", () => {
            // Placeholder for future function insertion UI
            console.log("Function button clicked.");
        });

        // Event listeners for the name box
        this.nameBox.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                this._handleNameBoxNavigation();
            } else if (e.key === "Escape") {
                e.preventDefault();
                this._revertNameBox();
                this.grid.canvas.focus();
            }
        });

        this.nameBox.addEventListener("blur", () => {
            // Attempt to navigate, which will revert the value if invalid
            this._handleNameBoxNavigation();
        });
    }

    _handleNameBoxNavigation() {
        const address = this.nameBox.value;
        const coords = this.grid.parseCellAddress(address);

        if (coords) {
            // Valid address, so navigate
            this.grid.selectionManager.setAnchor(coords.row, coords.col);
            this.grid._ensureCellIsVisible(coords.row, coords.col);
            this.grid.requestDraw();
            this.grid.canvas.focus();
        } else {
            // Invalid address, so revert
            this._revertNameBox();
        }
    }

    _revertNameBox() {
        if (this.activeCell) {
            this.nameBox.value = this.grid.getCellAddress(
                this.activeCell.row,
                this.activeCell.col
            );
        } else {
            this.nameBox.value = "";
        }
    }

    _commitChange() {
        if (!this.activeCell) return;
        this.grid.commitCellEdit(
            this.activeCell.row,
            this.activeCell.col,
            this.originalValue,
            this.formulaInput.value
        );
        this.originalValue = this.formulaInput.value;
    }

    _cancelChange() {
        this.formulaInput.value = this.originalValue;
    }

    async updateSelection(selection) {
        // Clear everything if no selection
        if (!selection) {
            this.nameBox.value = "";
            this.formulaInput.value = "";
            this.activeCell = null;
            return;
        }

        // Update Name Box and Formula Input based on active cell
        const activeCell = this.grid.selectionManager.getActiveCell();
        this.activeCell = activeCell;

        if (activeCell) {
            // Only update the name box's value if it's not currently focused by the user
            if (document.activeElement !== this.nameBox) {
                this.nameBox.value = this.grid.getCellAddress(
                    activeCell.row,
                    activeCell.col
                );
            }
            const value = await this.grid.cellManager.getCellValue(
                activeCell.row,
                activeCell.col
            );
            this.originalValue = value || "";
            this.formulaInput.value = this.originalValue;
        } else {
            this.nameBox.value = "";
            this.originalValue = "";
            this.formulaInput.value = "";
        }
    }
}
