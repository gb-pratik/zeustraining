const coursesData = [
    {
        id: 1,
        title: "Acceleration",
        imageUrl: "assets/images/imageMask-1.svg",
        subject: "Physics",
        grade: "Grade 7",
        grade_plus: "+2",
        units: 4,
        lessons: 18,
        topics: 24,
        classes: ["Mr. Frank's Class B"],
        hasPreview: true,
        hasGradeSubmissions: true,
        hasManageCourse: true,
        hasReports: true,
        students: 50,
        dateRange: "21-Jan-2020 - 21-Aug-2020",
        isFavorite: true,
    },
    {
        id: 2,
        title: "Displacement, Velocity and Speed",
        imageUrl: "assets/images/imageMask-2.svg",
        subject: "Physics 2",
        grade: "Grade 6",
        grade_plus: "+3",
        units: 2,
        lessons: 15,
        topics: 20,
        classes: [],
        hasPreview: true,
        hasGradeSubmissions: false,
        hasManageCourse: false,
        hasReports: true,
        isFavorite: true,
    },
    {
        id: 3,
        title: "Introduction to Biology: Micro organisms and how they affec...",
        imageUrl: "assets/images/imageMask.svg",
        subject: "Biology",
        grade: "Grade 4",
        grade_plus: "+1",
        units: 5,
        lessons: 16,
        topics: 22,
        classes: ["All Classes"],
        hasPreview: true,
        hasGradeSubmissions: false,
        hasManageCourse: false,
        hasReports: true,
        students: 300,
        isFavorite: true,
    },
    {
        id: 4,
        title: "Introduction to High School Mathematics",
        imageUrl: "assets/images/imageMask-3.svg",
        subject: "Mathematics",
        grade: "Grade 8",
        grade_plus: "+3",
        classes: ["Mr. Frank's Class A"],
        hasPreview: true,
        hasGradeSubmissions: true,
        hasManageCourse: true,
        hasReports: true,
        students: 44,
        dateRange: "14-Oct-2019 - 20-Oct-2020",
        isFavorite: false,
    },
];

function renderCourses(courses) {
    const courseGrid = document.querySelector(".course-grid");
    if (!courseGrid) return;
    courseGrid.innerHTML = "";
    courses.forEach((course) => {
        const hasClasses = course.classes.length > 0;
        const cardHTML = `
            <div class="course-card">
                <div class="card-data">
                    <img class="course-thumbnail" src="${
                        course.imageUrl
                    }" alt="${course.title} thumbnail" />
                    <div class="card-text">
                        <div class="course-header">
                            <h3 class="quicksand-medium">${course.title}</h3>
                            <img class="favorite-icon ${
                                !course.isFavorite ? "unfavorited" : ""
                            }" src="assets/icons/favourite.svg" alt="Favorite" />
                        </div>
                        <div class="course-subject quicksand-regular">
                            <span>${course.subject}</span>
                            <span class="separator">|</span>
                            <span >${course.grade}
                                <span class="grade-plus quicksand">${
                                    course.grade_plus
                                }</span>
                            </span>
                        </div>
                        ${
                            course.units
                                ? `
                        <div class="course-content-info quicksand-regular">
                            <span><strong>${course.units}</strong> Units</span>
                            <span><strong>${course.lessons}</strong> Lessons</span>
                            <span><strong>${course.topics}</strong> Topics</span>
                        </div>`
                                : ""
                        }
                        <div class="course-teacher-select quicksand-medium">
                            <select name="teacher" ${
                                !hasClasses ? "disabled" : ""
                            }>
                                ${
                                    hasClasses
                                        ? course.classes
                                              .map(
                                                  (c) => `<option>${c}</option>`
                                              )
                                              .join("")
                                        : "<option>No Classes</option>"
                                }
                            </select>
                        </div>
                        ${
                            course.students
                                ? `
                        <div class="enrollment-duration quicksand-regular">
                            <span>${course.students} Students</span>
                            ${
                                course.dateRange
                                    ? `<span class="separator-light">|</span><span>${course.dateRange}</span>`
                                    : ""
                            }
                        </div>`
                                : ""
                        }
                    </div>
                </div>
                <div class="horizontal-separator"></div>
                <div class="card-actions">
                    <img src="assets/icons/preview.svg" alt="Preview" class="${
                        !course.hasPreview ? "disabled" : ""
                    }"/>
                    <img src="assets/icons/manage course.svg" alt="Manage Course" class="${
                        !course.hasManageCourse ? "disabled" : ""
                    }" />
                    <img src="assets/icons/grade submissions.svg" alt="Grade Submissions" class="${
                        !course.hasGradeSubmissions ? "disabled" : ""
                    }" />
                    <img src="assets/icons/reports.svg" alt="Reports" class="${
                        !course.hasReports ? "disabled" : ""
                    }"/>
                </div>
            </div>
        `;
        courseGrid.innerHTML += cardHTML;
    });
}

function setupHoverToggle(containerId, popupId) {
    const container = document.getElementById(containerId);
    const popup = document.getElementById(popupId);
    if (!container || !popup) {
        console.error(
            `Element not found for hover toggle: ${containerId} or ${popupId}`
        );
        return;
    }
    container.addEventListener("mouseenter", () => {
        popup.classList.add("show");
    });
    container.addEventListener("mouseleave", () => {
        popup.classList.remove("show");
    });
}

document.addEventListener("DOMContentLoaded", () => {
    renderCourses(coursesData);
    setupHoverToggle("hamburger-container", "hamburger-popup");
    setupHoverToggle("alerts-container", "alerts-popup");
    setupHoverToggle("announcements-container", "announcements-popup");
});
