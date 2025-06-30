export class StatusBar {
    // Initializes the StatusBar by getting references to the DOM elements.
    constructor() {
        this.avgEl = document.getElementById("stat-avg");
        this.countEl = document.getElementById("stat-count");
        this.minEl = document.getElementById("stat-min");
        this.maxEl = document.getElementById("stat-max");
        this.sumEl = document.getElementById("stat-sum");
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

        const count = numbers.length;
        const sum = numbers.reduce((a, b) => a + b, 0);
        const avg = sum / count;
        const min = Math.min(...numbers);
        const max = Math.max(...numbers);

        this.avgEl.textContent = avg.toFixed(2);
        this.countEl.textContent = count.toString();
        this.minEl.textContent = min.toString();
        this.maxEl.textContent = max.toString();
        this.sumEl.textContent = sum.toString();
    }
}