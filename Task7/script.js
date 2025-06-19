class DraggableBox {
    /**
     * @param {HTMLElement} containerElement The container within which this box can be dragged.
     * @param {object} options Configuration for the box.
     * @param {number} options.initialX Initial horizontal position.
     * @param {number} options.initialY Initial vertical position.
     * @param {string} options.color Background color of the box.
     */
    constructor(containerElement, options = {}) {
        this.containerElement = containerElement;

        const defaults = {
            initialX: 20,
            initialY: 20,
            color: "#e74c3c",
        };
        this.options = { ...defaults, ...options };

        this.isDragging = false;
        this.offsetX = 0;
        this.offsetY = 0;

        this.createElement();
        this.initEventListeners();
    }

    createElement() {
        this.element = document.createElement("div");
        this.element.className = "draggable-box";
        this.element.style.left = `${this.options.initialX}px`;
        this.element.style.top = `${this.options.initialY}px`;
        this.element.style.backgroundColor = this.options.color;

        this.containerElement.appendChild(this.element);
    }

    initEventListeners() {
        this.element.addEventListener("pointerdown", this.onPointerDown);
        document.addEventListener("pointermove", this.onPointerMove);
        document.addEventListener("pointerup", this.onPointerUp);
        window.addEventListener("resize", this.ensureInBounds);
    }

    onPointerDown = (e) => {
        this.isDragging = true;
        this.element.style.cursor = "grabbing";
        this.element.setPointerCapture(e.pointerId);

        this.offsetX = e.clientX - this.element.offsetLeft;
        this.offsetY = e.clientY - this.element.offsetTop;
    };

    onPointerMove = (e) => {
        if (!this.isDragging) return;

        e.preventDefault();

        let newX = e.clientX - this.offsetX;
        let newY = e.clientY - this.offsetY;

        const containerRect = this.containerElement.getBoundingClientRect();

        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
        if (newX + this.element.offsetWidth > containerRect.width) {
            newX = containerRect.width - this.element.offsetWidth;
        }
        if (newY + this.element.offsetHeight > containerRect.height) {
            newY = containerRect.height - this.element.offsetHeight;
        }

        this.element.style.left = `${newX}px`;
        this.element.style.top = `${newY}px`;
    };

    onPointerUp = (e) => {
        if (!this.isDragging) return;

        this.isDragging = false;
        this.element.style.cursor = "grab";
        this.element.releasePointerCapture(e.pointerId);
    };

    ensureInBounds = () => {
        const containerRect = this.containerElement.getBoundingClientRect();
        let currentX = this.element.offsetLeft;
        let currentY = this.element.offsetTop;

        let needsCorrection = false;

        if (currentX < 0) {
            currentX = 0;
            needsCorrection = true;
        }
        if (currentY < 0) {
            currentY = 0;
            needsCorrection = true;
        }
        if (currentX + this.element.offsetWidth > containerRect.width) {
            currentX = containerRect.width - this.element.offsetWidth;
            needsCorrection = true;
        }
        if (currentY + this.element.offsetHeight > containerRect.height) {
            currentY = containerRect.height - this.element.offsetHeight;
            needsCorrection = true;
        }

        if (needsCorrection) {
            this.element.style.left = `${currentX}px`;
            this.element.style.top = `${currentY}px`;
        }
    };
}

class DraggableContainer {
    /**
     * @param {HTMLElement} parentElement The element to append this container to.
     * @param {object} options Configuration for the container.
     * @param {string} options.width CSS width of the container.
     * @param {string} options.height CSS height of the container.
     * @param {string} options.backgroundColor Background color of the container.
     */
    constructor(parentElement, options = {}) {
        this.parentElement = parentElement;

        const defaults = {
            width: "100%",
            height: "100%",
            backgroundColor: "#000000",
        };
        this.options = { ...defaults, ...options };

        this.boxes = [];
        this.createElement();
    }

    createElement() {
        this.element = document.createElement("div");
        this.element.className = "background-container";
        this.element.style.width = this.options.width;
        this.element.style.height = this.options.height;
        this.element.style.backgroundColor = this.options.backgroundColor;

        this.parentElement.appendChild(this.element);
    }

    /**
     * Creates a new DraggableBox and adds it to this container.
     * @param {object} boxOptions Options to pass to the DraggableBox constructor.
     * @returns {DraggableBox} The newly created box instance.
     */
    addBox(boxOptions = {}) {
        const newBox = new DraggableBox(this.element, boxOptions);
        this.boxes.push(newBox);

        return newBox;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const wrapper = document.getElementById("app-wrapper");

    const mainContainer = new DraggableContainer(wrapper, {
        width: "50%",
        height: "100vh",
    });

    mainContainer.addBox({ initialX: 50, initialY: 50, color: "#e74c3c" }); // Red
    mainContainer.addBox({ initialX: 150, initialY: 100, color: "#3498db" }); // Blue
    mainContainer.addBox({ initialX: 80, initialY: 200, color: "#f1c40f" }); // Yellow

    const secondContainer = new DraggableContainer(wrapper, {
        width: "35%",
        height: "100vh",
        backgroundColor: "#16a085", // A different background color
    });

    secondContainer.addBox({ initialX: 30, initialY: 30, color: "#ecf0f1" }); // White
});
