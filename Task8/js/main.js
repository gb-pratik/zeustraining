import { Grid } from "./grid.js";
import { initDB } from "./db.js";
import { StatusBar } from "./statusBar.js";

// Main entry point of the application.
// This runs after the DOM is fully loaded.
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Initialize the database before doing anything else.
        await initDB();

        // The container element where the grid will be mounted.
        const appContainer = document.body;

        // StatusBar and FormulaBar will add themselves to appContainer.
        // We instantiate StatusBar here and pass it to the Grid.
        const statusBar = new StatusBar(appContainer);

        const grid = new Grid(appContainer, { statusBar });

        await grid.columnManager.loadWidths();
        await grid.rowManager.loadHeights();
        await grid.cellManager.loadMaxEditedCell();
        grid.requestDraw();

        // Set up global keyboard shortcuts for undo and redo.
        window.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "z") {
                e.preventDefault();
                grid.commandManager.undo();
            }
            if (
                (e.ctrlKey || e.metaKey) &&
                (e.key === "y" || (e.shiftKey && e.key === "Z"))
            ) {
                e.preventDefault();
                grid.commandManager.redo();
            }
        });
    } catch (error) {
        console.error("Failed to initialize the application:", error);
    }
});
