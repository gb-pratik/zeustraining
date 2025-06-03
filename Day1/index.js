document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const nameInput = document.getElementById('name');
    const commentsInput = document.getElementById('comments');
    const genderInputs = document.getElementsByName('gender');

    form.addEventListener('submit', function (e) {
        let valid = true;
        let errorMsg = '';

        if (!nameInput.value.trim()) {
            valid = false;
            errorMsg += 'Name is required.\n';
        }

        if (!commentsInput.value.trim()) {
            valid = false;
            errorMsg += 'Comments are required.\n';
        }

        let genderSelected = false;
        if (genderInputs[0].checked) {
            genderSelected = true;
        }
        if (genderInputs[1].checked) {
            genderSelected = true;
        }

        if (!genderSelected) {
            valid = false;
            errorMsg += 'Please select a gender.\n';
        }

        if (!valid) {
            e.preventDefault();
            alert(errorMsg);
        }
    });
});