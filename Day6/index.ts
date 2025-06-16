document.addEventListener("DOMContentLoaded", () => {
    const popupContainers = document.querySelectorAll<HTMLElement>(
        ".header-popup-container"
    );

    popupContainers.forEach((container) => {
        const popup = container.querySelector<HTMLElement>(".popup-menu");
        const badge = container.querySelector<HTMLElement>(".badge-count");
        if (popup) {
            container.addEventListener("mouseover", () => {
                popup.classList.add("show");
            });

            container.addEventListener("mouseout", () => {
                popup.classList.remove("show");
            });
        }
        if (badge) {
            container.addEventListener("mouseover", () => {
                badge.classList.add("hide");
            });

            container.addEventListener("mouseout", () => {
                badge.classList.remove("hide");
            });
        }
    });
});
