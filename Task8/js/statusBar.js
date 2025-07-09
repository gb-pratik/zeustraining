export class StatusBar {
    constructor(container) {
        this.container = container;
        this.element = document.createElement("div");
        this.element.id = "status-bar";

        this._createDOMElements();
        this.container.appendChild(this.element);
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
        this.element.appendChild(wrapper); // Append to the status bar's own element

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

        if (cellValues.length === 0) {
            this.clear();
            return;
        }

        const count = cellValues.length;
        this.countEl.textContent = count.toLocaleString();

        if (numbers.length === 0) {
            this.avgEl.textContent = "0";
            this.minEl.textContent = "0";
            this.maxEl.textContent = "0";
            this.sumEl.textContent = "0";
            return;
        }

        const sum = numbers.reduce((a, b) => a + b, 0);
        const avg = sum / numbers.length;
        const min = Math.min(...numbers);
        const max = Math.max(...numbers);

        this.avgEl.textContent = avg.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
        this.minEl.textContent = min.toLocaleString();
        this.maxEl.textContent = max.toLocaleString();
        this.sumEl.textContent = sum.toLocaleString();
    }
}

//     // Updates the status bar with calculations based on the provided cell values.
//     update(cellValues) {
//         const numbers = cellValues
//             .map((v) => parseFloat(v))
//             .filter((n) => !isNaN(n));

//         if (cellValues.length === 0) {
//             this.clear();
//             return;
//         }
//         const count = cellValues.length;
//         this.countEl.textContent = count.toLocaleString();
//         if (numbers.length === 0) {
//             // this.clear();
//             return;
//         }
//         const sum = numbers.reduce((a, b) => a + b, 0);
//         const avg = sum / numbers.length;
//         const min = Math.min(...numbers);
//         const max = Math.max(...numbers);

//         this.avgEl.textContent = avg.toLocaleString(undefined, {
//             minimumFractionDigits: 2,
//             maximumFractionDigits: 2,
//         });
//         this.minEl.textContent = min.toLocaleString();
//         this.maxEl.textContent = max.toLocaleString();
//         this.sumEl.textContent = sum.toLocaleString();
//     }
// }
