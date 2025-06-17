document.addEventListener("DOMContentLoaded", () => {
    const backgroundDiv = document.createElement("div");
    backgroundDiv.className = "background-container";

    const draggableBox = document.createElement("div");
    draggableBox.className = "draggable-box";

    backgroundDiv.appendChild(draggableBox);
    document.body.appendChild(backgroundDiv);

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    draggableBox.addEventListener("pointerdown", (e) => {
        isDragging = true;
        draggableBox.style.cursor = "grabbing";

        offsetX = e.clientX - draggableBox.offsetLeft;
        offsetY = e.clientY - draggableBox.offsetTop;

        draggableBox.setPointerCapture(e.pointerId);
    });

    document.addEventListener("pointermove", (e) => {
        if (!isDragging) return;

        let newX = e.clientX - offsetX;
        let newY = e.clientY - offsetY;

        const containerRect = backgroundDiv.getBoundingClientRect();

        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
        if (newX + draggableBox.offsetWidth > containerRect.width) {
            newX = containerRect.width - draggableBox.offsetWidth;
        }
        if (newY + draggableBox.offsetHeight > containerRect.height) {
            newY = containerRect.height - draggableBox.offsetHeight;
        }

        draggableBox.style.left = `${newX}px`;
        draggableBox.style.top = `${newY}px`;
    });

    document.addEventListener("pointerup", (e) => {
        if (!isDragging) return;

        isDragging = false;
        draggableBox.style.cursor = "grab";
        draggableBox.releasePointerCapture(e.pointerId);
    });

    const ensureBoxInBounds = () => {
        const containerRect = backgroundDiv.getBoundingClientRect();
        let currentX = draggableBox.offsetLeft;
        let currentY = draggableBox.offsetTop;

        let needsCorrection = false;

        if (currentX + draggableBox.offsetWidth > containerRect.width) {
            currentX = containerRect.width - draggableBox.offsetWidth;
            needsCorrection = true;
        }
        if (currentY + draggableBox.offsetHeight > containerRect.height) {
            currentY = containerRect.height - draggableBox.offsetHeight;
            needsCorrection = true;
        }

        if (currentX < 0) {
            currentX = 0;
            needsCorrection = true;
        }

        if (currentY < 0) {
            currentY = 0;
            needsCorrection = true;
        }

        if (needsCorrection) {
            draggableBox.style.left = `${currentX}px`;
            draggableBox.style.top = `${currentY}px`;
        }
    };

    window.addEventListener("resize", ensureBoxInBounds);
});
