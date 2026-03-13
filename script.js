// --- Preloader Logic ---
const preloaderStartTime = Date.now();

const hidePreloader = () => {
    const preloader = document.getElementById('preloader');
    if (!preloader || preloader.classList.contains('hidden')) return;

    preloader.classList.add('hidden');
    setTimeout(() => {
        preloader.style.display = 'none';
    }, 500);
};

document.addEventListener('DOMContentLoaded', () => {
    const minimumPreloaderTime = 3000;
    const elapsedTime = Date.now() - preloaderStartTime;
    const remainingTime = Math.max(0, minimumPreloaderTime - elapsedTime);

    setTimeout(() => {
        requestAnimationFrame(hidePreloader);
    }, remainingTime);
});

window.addEventListener('load', () => {
    const minimumPreloaderTime = 3000;
    const elapsedTime = Date.now() - preloaderStartTime;
    const remainingTime = Math.max(0, minimumPreloaderTime - elapsedTime);

    setTimeout(hidePreloader, remainingTime);
});

document.addEventListener('DOMContentLoaded', () => {
    // --- Basic Setup ---
    const menuToggle = document.querySelector('.menu-toggle');
    const fullScreenNav = document.querySelector('.full-screen-nav');
    const closeNavButton = document.querySelector('.close-nav');
    const navLinkItems = document.querySelectorAll('.full-screen-nav .nav-link-item');
    const header = document.querySelector('.main-header');
    const video = document.querySelector('.hero-video');

    // --- Navigation Toggle ---
    if (menuToggle && fullScreenNav && closeNavButton) {
        const closeMenu = () => {
            fullScreenNav.classList.remove('active');
            menuToggle.classList.remove('active');
            document.body.style.overflow = '';
        };
        menuToggle.addEventListener('click', () => {
            fullScreenNav.classList.add('active');
            menuToggle.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
        closeNavButton.addEventListener('click', closeMenu);
        navLinkItems.forEach(link => link.addEventListener('click', closeMenu));
    }

    // --- Sticky Header Background ---
    if (header) {
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 50);
        });
    }
    
    // --- Video Speed on Scroll ---
    if (video) {
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            video.playbackRate = 4.0;
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                video.playbackRate = 1.0;
            }, 150);
        });
    }

    // --- Custom Cursor + Echo Trail Logic ---
    const cursors = document.querySelectorAll('.cursor');
    const leaderCursor = document.getElementById('cursor-leader');
    if (cursors.length > 0 && leaderCursor) {
        const isTouchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches || 'ontouchstart' in window;
        const trailingCursors = Array.from(cursors).filter(cursor => cursor !== leaderCursor);

        trailingCursors.forEach(cursor => {
            cursor.style.display = 'none';
            cursor.style.opacity = '0';
        });

        let pointerX = window.innerWidth / 2;
        let pointerY = window.innerHeight / 2;
        let cursorX = pointerX;
        let cursorY = pointerY;
        let touchActive = false;
        let cursorVisible = false;
        let lastEchoTime = 0;

        const desktopEchoInterval = 80;
        const touchEchoInterval = 55;

        const createPointerEcho = (x, y) => {
            const echo = document.createElement('span');
            echo.className = 'pointer-echo';
            echo.style.left = `${x}px`;
            echo.style.top = `${y}px`;
            document.body.appendChild(echo);
            echo.addEventListener('animationend', () => echo.remove(), { once: true });
        };

        const maybeCreatePointerEcho = (x, y, force = false) => {
            const now = performance.now();
            const interval = touchActive ? touchEchoInterval : desktopEchoInterval;
            if (force || now - lastEchoTime >= interval) {
                lastEchoTime = now;
                createPointerEcho(x, y);
            }
        };

        const showLeader = () => {
            cursorVisible = true;
            leaderCursor.style.display = 'block';
            leaderCursor.style.opacity = '1';
        };

        const hideLeader = () => {
            cursorVisible = false;
            leaderCursor.style.opacity = '0';
        };

        const setPointerTarget = (x, y, options = {}) => {
            const { echo = false, forceEcho = false } = options;
            pointerX = x;
            pointerY = y;
            showLeader();

            if (echo) {
                maybeCreatePointerEcho(x, y, forceEcho);
            }
        };

        if (isTouchDevice) {
            document.body.style.cursor = 'auto';
            hideLeader();

            const handleTouchStart = (event) => {
                const touch = event.touches[0];
                if (!touch) return;
                touchActive = true;
                cursorX = touch.clientX;
                cursorY = touch.clientY;
                setPointerTarget(touch.clientX, touch.clientY, { echo: true, forceEcho: true });
            };

            const handleTouchMove = (event) => {
                const touch = event.touches[0];
                if (!touch) return;
                setPointerTarget(touch.clientX, touch.clientY, { echo: true, forceEcho: false });
            };

            const handleTouchEnd = () => {
                touchActive = false;
                hideLeader();
            };

            window.addEventListener('touchstart', handleTouchStart, { passive: true });
            window.addEventListener('touchmove', handleTouchMove, { passive: true });
            window.addEventListener('touchend', handleTouchEnd, { passive: true });
            window.addEventListener('touchcancel', handleTouchEnd, { passive: true });
        } else {
            window.addEventListener('mousemove', (event) => {
                setPointerTarget(event.clientX, event.clientY, { echo: true, forceEcho: false });
            });

            document.addEventListener('mouseleave', hideLeader);
            document.addEventListener('mouseenter', showLeader);
        }

        function animateLeaderCursor() {
            const easingFactor = touchActive ? 0.28 : 0.18;
            cursorX += (pointerX - cursorX) * easingFactor;
            cursorY += (pointerY - cursorY) * easingFactor;

            leaderCursor.style.transform = `translate3d(${cursorX - leaderCursor.offsetWidth / 2}px, ${cursorY - leaderCursor.offsetHeight / 2}px, 0)`;

            if (!cursorVisible) {
                leaderCursor.style.opacity = '0';
            }

            requestAnimationFrame(animateLeaderCursor);
        }

        animateLeaderCursor();
    }


    // --- Color Inversion on Scroll Logic ---
    const workSection = document.querySelector('.work-section');
    if (workSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                document.body.classList.toggle('invert-colors', entry.isIntersecting);
            });
        }, { threshold: 0.15 });
        observer.observe(workSection);
    }

    // --- DYNAMIC CONTENT LOADER ---
    const featuredWorkGrid = document.getElementById('featured-work-grid');
    const workPageList = document.getElementById('work-page-list');
    const projectDetailContainer = document.getElementById('project-detail-container');

    // NEW: Helper function to check if a file is a video
    const isVideo = (filename) => {
    if (!filename) return false;
    const lowercased = filename.toLowerCase();
    // Only return true for actual video formats like .mp4.
    // .gif will now be treated as an image for rendering purposes.
    return lowercased.endsWith('.mp4');
};

    async function fetchProjects() {
        try {
            const response = await fetch('projects.json', { cache: 'force-cache' });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error("Could not fetch projects:", error);
            return null;
        }
    }
    
    function populateFeaturedGrid(projects) {
        if (!featuredWorkGrid) return;
        const featuredProjects = projects.filter(p => p.featured);
        featuredWorkGrid.innerHTML = ''; 

        featuredProjects.forEach((project, index) => {
            const isLarge = index === 0 && window.innerWidth > 900;
            const projectItem = document.createElement('a');
            projectItem.href = `project.html?id=${project.id}`;
            projectItem.className = `work-item ${isLarge ? 'work-item-large' : ''}`;
            
            let tagsHTML = project.tags.map(tag => `<span>${tag}</span>`).join('');

            // MODIFIED: Conditionally generate video or image tag
            let mediaHTML = '';
            // If project.thumbnail is an actual video (e.g., .mp4), use a video tag.
            // Otherwise (for .gif, .webp, .jpg, .png), use an img tag.
            if (isVideo(project.thumbnail)) {
                mediaHTML = `
                    <video autoplay loop muted playsinline class="work-img">
                        <source src="${project.thumbnail}" type="video/mp4">
                    </video>`;
            } else {
                mediaHTML = `<img src="${project.thumbnail}" alt="${project.title} Project Thumbnail" class="work-img">`;
            }

            projectItem.innerHTML = `
                <div class="work-image-container">
                     ${mediaHTML}
                </div>
                <div class="work-info-tab">
                    <div class="work-info">
                        <h3>${project.title}</h3>
                        ${project.description ? `<p>${project.description}</p>` : ''}
                    </div>
                    <div class="work-tags">${tagsHTML}</div>
                </div>
            `;
            featuredWorkGrid.appendChild(projectItem);
        });
    }

    function populateWorkList(projects) {
        if (!workPageList) return;
        workPageList.innerHTML = '';

        projects.forEach(project => {
            const projectItem = document.createElement('a');
            projectItem.href = `project.html?id=${project.id}`;
            projectItem.className = 'project-item';
            
            // IMPORTANT: The hover preview will only work for images.
            if (!isVideo(project.thumbnail)) {
                projectItem.dataset.image = project.thumbnail;
            }

            let tagsHTML = project.tags.map(tag => `<span>${tag}</span>`).join('');

            projectItem.innerHTML = `
                <div class="project-info">
                    <span class="project-title">${project.title}</span>
                    <span class="project-desc">${project.description}</span>
                </div>
                <div class="project-tags">${tagsHTML}</div>
            `;
            workPageList.appendChild(projectItem);
        });
    }

    function populateProjectDetail(projects) {
        if (!projectDetailContainer) return;
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('id');
        const project = projects.find(p => p.id === projectId);

        if (project) {
            document.title = `${project.title} - Sada Studio`;
            const tagsHTML = project.tags.map(tag => `<span>${tag}</span>`).join('');
            
            // MODIFIED: Handle both images and videos in the gallery
            const imagesHTML = project.images.map(mediaSrc => {
                // If mediaSrc is an actual video (e.g., .mp4), use a video tag.
                // Otherwise (for .gif, .webp, .jpg, .png), use an img tag.
                if (isVideo(mediaSrc)) {
                    return `<video autoplay loop muted playsinline><source src="${mediaSrc}" type="video/mp4"></video>`;
                } else {
                    return `<img src="${mediaSrc}" alt="${project.title} gallery image">`;
                }
            }).join('');

            projectDetailContainer.innerHTML = `
                <div class="project-info-wrapper">
                    <div class="project-details-column">
                        <h1>${project.title}</h1>
                        <p class="short-desc">${project.description}</p>
                        <div class="tags">${tagsHTML}</div>
                        <p class="long-desc">${project.longDescription || ''}</p>
                    </div>
                    <a href="work.html" class="btn see-all-work-btn"><span>← Back</span></a>
                </div>
                <div class="project-gallery-column">${imagesHTML}</div>
            `;
        } else {
            projectDetailContainer.innerHTML = `
                <div class="not-found">
                    <h1>Project Not Found</h1>
                    <p>The project you are looking for does not exist.</p>
                    <br>
                    <a href="work.html" class="btn">View All Work</a>
                </div>
            `;
        }
    }

    // --- WORK PAGE THUMBNAIL HOVER LOGIC ---
    const thumbnailViewer = document.getElementById('project-thumbnail-viewer');

    if (workPageList && thumbnailViewer) {
        let mouseX = 0, mouseY = 0;
        let lastMouseX = 0;
        let rotation = 0;
        let animationFrameId = null;

        const animate = () => {
            const velocityX = mouseX - lastMouseX;
            lastMouseX = mouseX;
            const rotationForce = 0.1; 
            const damping = 0.92;      
            rotation += velocityX * rotationForce;
            rotation *= damping;
            thumbnailViewer.style.transform = `translate(${mouseX + 15}px, ${mouseY + 15}px) rotate(${rotation}deg)`;
            animationFrameId = requestAnimationFrame(animate);
        };

        workPageList.addEventListener('mouseover', e => {
            const projectItem = e.target.closest('.project-item');
            if (projectItem && projectItem.dataset.image) {
                thumbnailViewer.style.backgroundImage = `url(${projectItem.dataset.image})`;
                thumbnailViewer.classList.add('visible');
            }
        });

        workPageList.addEventListener('mousemove', e => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        workPageList.addEventListener('mouseenter', e => {
            lastMouseX = e.clientX;
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            animate();
        });

        workPageList.addEventListener('mouseleave', () => {
            thumbnailViewer.classList.remove('visible');
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
            rotation = 0;
        });
    }

    // --- Main function to initialize pages ---
    async function initializePage() {
        const projects = await fetchProjects();
        if (!projects) {
            if (projectDetailContainer) {
                projectDetailContainer.innerHTML = `<div class="not-found"><h1>Error</h1><p>Could not load project data. Please try again later.</p></div>`
            }
            return;
        }

        populateFeaturedGrid(projects);
        populateWorkList(projects);
        populateProjectDetail(projects);
    }

    initializePage();
});