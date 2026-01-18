document.addEventListener('DOMContentLoaded', () => {
    // OS Switcher Logic
    const osBtns = document.querySelectorAll('.os-btn');
    const codeWrappers = document.querySelectorAll('.code-wrapper');
    const copyBtn = document.getElementById('copy-btn');

    osBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const os = btn.getAttribute('data-os');

            // Update buttons
            osBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update code blocks
            codeWrappers.forEach(wrapper => {
                wrapper.classList.remove('active');
                if (wrapper.id === `${os}-code`) {
                    wrapper.classList.add('active');
                }
            });
        });
    });

    // Unified Copy Logic
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const activeCode = document.querySelector('.code-wrapper.active code');
            if (activeCode) {
                const text = activeCode.innerText;
                navigator.clipboard.writeText(text).then(() => {
                    // Visual feedback
                    const originalIcon = copyBtn.innerHTML;
                    copyBtn.innerHTML = `
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    `;
                    setTimeout(() => {
                        copyBtn.innerHTML = originalIcon;
                    }, 2000);
                });
            }
        });
    }

    // Intersection Observer for fade-in effect on features
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    document.querySelectorAll('.feature-min').forEach(feature => {
        feature.style.opacity = '0';
        feature.style.transform = 'translateY(20px)';
        feature.style.transition = 'all 0.6s ease-out';
        observer.observe(feature);
    });
});
