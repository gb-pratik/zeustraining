import { Grid } from "./grid.js";
import { initDB } from "./db.js";

// Main entry point of the application.
// This runs after the DOM is fully loaded.
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Initialize the database before doing anything else.
        await initDB();

        // The container element where the grid will be mounted.
        const appContainer = document.body;

        const grid = new Grid(appContainer, {});

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
