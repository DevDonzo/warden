document.addEventListener('DOMContentLoaded', () => {
    const copyBtn = document.getElementById('copy-btn');

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const command = 'npm install -g @devdonzo/warden';
            navigator.clipboard.writeText(command).then(() => {
                const originalContent = copyBtn.innerHTML;

                // Success Tab Checkmark
                copyBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                `;

                setTimeout(() => {
                    copyBtn.innerHTML = originalContent;
                }, 2000);
            });
        });
    }

    // Scroll reveal for features
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.feature-item').forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(10px)';
        item.style.transition = `all 0.5s ease-out ${index * 0.1}s`;
        observer.observe(item);
    });
});
