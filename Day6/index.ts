document.addEventListener("DOMContentLoaded", () => {
    const popupContainers = document.querySelectorAll<HTMLElement>(
        ".header-popup-container"
    );

    popupContainers.forEach((container) => {
        const popup = container.querySelector<HTMLElement>(".popup-menu");

        if (popup) {
            container.addEventListener("mouseover", () => {
                popup.classList.add("show");
            });

            container.addEventListener("mouseout", () => {
                popup.classList.remove("show");
            });
        }
    });
});
