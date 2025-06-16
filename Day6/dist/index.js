"use strict";
document.addEventListener("DOMContentLoaded", function () {
    var popupContainers = document.querySelectorAll(".header-popup-container");
    popupContainers.forEach(function (container) {
        var popup = container.querySelector(".popup-menu");
        var badge = container.querySelector(".badge-count");
        if (popup) {
            container.addEventListener("mouseover", function () {
                popup.classList.add("show");
            });
            container.addEventListener("mouseout", function () {
                popup.classList.remove("show");
            });
        }
        if (badge) {
            container.addEventListener("mouseover", function () {
                badge.classList.add("hide");
            });
            container.addEventListener("mouseout", function () {
                badge.classList.remove("hide");
            });
        }
    });
});
