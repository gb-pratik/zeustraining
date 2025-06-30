import { Grid } from "./grid.js";
import { initDB } from "./db.js";

// Main entry point of the application.
// This runs after the DOM is fully loaded.
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Initialize the database before doing anything else.
        await initDB();

        const canvas = document.getElementById("grid-canvas");
        if (!canvas) {
            return;
        }

        // Create a new grid instance.
        const grid = new Grid(canvas, {});

        // Asynchronously initialize the grid's data.
        await grid.init();

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
    } catch (error) {}
});