// Initialize AOS
AOS.init();

// Fade In on Scroll
const fadeElements = document.querySelectorAll('.fade-in');

window.addEventListener('scroll', () => {
    fadeElements.forEach(element => {
        if (element.getBoundingClientRect().top < window.innerHeight) {
            element.classList.add('visible');
        }
    });
});

// Lazy Loading Images
const lazyImages = document.querySelectorAll('.lazy');

const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const image = entry.target;
            image.src = image.dataset.src;
            image.classList.add('loaded');
            observer.unobserve(image);
        }
    });
}, { threshold: 0.1 });

lazyImages.forEach(image => {
    imageObserver.observe(image);
});

// Scroll Triggered Animations for Fade-In Text
const scrollText = document.querySelectorAll('.scroll-text');

window.addEventListener('scroll', () => {
    scrollText.forEach(element => {
        if (element.getBoundingClientRect().top < window.innerHeight) {
            element.classList.add('visible');
        }
    });
});
