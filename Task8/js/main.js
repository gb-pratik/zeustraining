// Use code with caution.
import { Grid } from "./grid.js";
import { initDB } from "./db.js";

document.addEventListener("DOMContentLoaded", async () => {
    try {
        await initDB();
        console.log("DB is ready, initializing grid.");

        const canvas = document.getElementById("grid-canvas");
        if (!canvas) {
            console.error("Canvas element not found!");
            return;
        }

        const grid = new Grid(canvas, {});

        await grid.init();

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
        alert(
            "Could not initialize the grid. Please check the console for errors."
        );
    }
});
