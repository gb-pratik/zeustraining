"use strict";
document.addEventListener("DOMContentLoaded", function () {
    var popupContainers = document.querySelectorAll(".header-popup-container");
    popupContainers.forEach(function (container) {
        var popup = container.querySelector(".popup-menu");
        if (popup) {
            container.addEventListener("mouseover", function () {
                popup.classList.add("show");
            });
            container.addEventListener("mouseout", function () {
                popup.classList.remove("show");
            });
        }
    });
});
