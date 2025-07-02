export class StatusBar {
    constructor(statusBarElement) {
        this.container = statusBarElement;
        this._createDOMElements();
    }

    //  Creates the internal span elements and appends them to the container.
    _createDOMElements() {
        // Create elements for each stat
        this.avgEl = this._createStatElement("Average", "stat-avg");
        this.countEl = this._createStatElement("Count", "stat-count");
        this.minEl = this._createStatElement("Min", "stat-min");
        this.maxEl = this._createStatElement("Max", "stat-max");
        this.sumEl = this._createStatElement("Sum", "stat-sum");
    }

    // Helper function to create a label and value span pair.
    _createStatElement(labelText, id) {
        const wrapper = document.createElement("span");
        const label = document.createElement("span");
        label.textContent = `${labelText}: `;

        const valueSpan = document.createElement("span");
        valueSpan.id = id;
        valueSpan.textContent = "0";

        wrapper.appendChild(label);
        wrapper.appendChild(valueSpan);
        this.container.appendChild(wrapper);

        return valueSpan; // Return the element we need to update
    }

    // Clears all the statistical data from the status bar.
    clear() {
        this.avgEl.textContent = "0";
        this.countEl.textContent = "0";
        this.minEl.textContent = "0";
        this.maxEl.textContent = "0";
        this.sumEl.textContent = "0";
    }

    // Updates the status bar with calculations based on the provided cell values.
    update(cellValues) {
        const numbers = cellValues
            .map((v) => parseFloat(v))
            .filter((n) => !isNaN(n));

        if (numbers.length === 0) {
            this.clear();
            return;
        }

        const count = cellValues.length;
        const sum = numbers.reduce((a, b) => a + b, 0);
        const avg = sum / numbers.length;
        const min = Math.min(...numbers);
        const max = Math.max(...numbers);

        this.avgEl.textContent = avg.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        this.countEl.textContent = count.toLocaleString();
        this.minEl.textContent = min.toLocaleString();
        this.maxEl.textContent = max.toLocaleString();
        this.sumEl.textContent = sum.toLocaleString();
    }
}
