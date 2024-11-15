// Custom Cursor Handling (optional)
document.body.addEventListener('mousemove', (event) => {
    const cursor = document.querySelector('.cursor');
    cursor.style.left = `${event.pageX - 10}px`;
    cursor.style.top = `${event.pageY - 10}px`;
});

// Smooth Scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});
