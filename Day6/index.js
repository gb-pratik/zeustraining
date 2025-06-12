document.addEventListener("DOMContentLoaded", () => {
    const popupContainers = document.querySelectorAll(
        ".header-popup-container"
    );

    popupContainers.forEach((container) => {
        const popup = container.querySelector(".popup-menu");

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
