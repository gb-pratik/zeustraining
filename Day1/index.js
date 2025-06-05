document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const nameIn = document.getElementById('name');
    const commentsIn = document.getElementById('comments');
    const genderIns = document.getElementsByName('gender');

    form.addEventListener('submit', function (e) 
    {
        let val = true;
        let msg = '';

        if (!nameIn.value.trim()) {
            val = false;
            msg += 'Name is required.\n';
        }

        if (!commentsIn.value.trim()) {
            val = false;
            msg += 'Comments are required.\n';
        }
        let flag = false;
        if (genderIns[0].checked) {
            flag = true;
        }
        if (genderIns[1].checked) {
            flag = true;
        }

        if (!flag) {
            val = false;
            msg += 'Please select a gender.\n';
        }

        if (!val) {
            e.preventDefault();
            alert(msg);
        }
    });
});
