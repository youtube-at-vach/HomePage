document.addEventListener('DOMContentLoaded', function() {
    let slideIndex = 0;
    const slides = document.querySelectorAll('.hero-slide');
    const slideInterval = 5000; // Time in milliseconds (5 seconds)

    function showSlides() {
        // Hide all slides
        slides.forEach(slide => {
            slide.classList.remove('active');
        });

        // Increment index and loop back if necessary
        slideIndex++;
        if (slideIndex > slides.length) {
            slideIndex = 1;
        }

        // Display the current slide
        if (slides[slideIndex - 1]) {
            slides[slideIndex - 1].classList.add('active');
        }

        // Call showSlides again after the interval
        setTimeout(showSlides, slideInterval);
    }

    // Initially show the first slide if slides exist
    if (slides.length > 0) {
        slides[0].classList.add('active');
        setTimeout(showSlides, slideInterval); // Start the slideshow
    }
});
