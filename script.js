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

        let pointerX = window.innerWidth / 2;
        let pointerY = window.innerHeight / 2;
        let cursorX = pointerX;
        let cursorY = pointerY;
        let touchActive = false;
        let cursorVisible = false;
        let lastEchoX = null;
        let lastEchoY = null;
        let lastMoveTimestamp = performance.now();
        let lastMoveVectorX = 0;
        let lastMoveVectorY = 0;

        const desktopBaseSpacing = 12;
        const touchBaseSpacing = 10;
        const minEchoSpacing = 5;

        const createPointerEcho = (x, y, vectorX = 0, vectorY = 0, speed = 0) => {
            const echo = document.createElement('span');
            const vectorLength = Math.hypot(vectorX, vectorY) || 1;
            const directionX = vectorX / vectorLength;
            const directionY = vectorY / vectorLength;
            const followDistance = Math.min(touchActive ? 10 : 8, 3 + speed * 0.2);
            const duration = Math.max(0.52, Math.min(touchActive ? 0.8 : 0.72, 0.58 + speed * 0.012));

            echo.className = 'pointer-echo';
            echo.style.left = `${x}px`;
            echo.style.top = `${y}px`;
            echo.style.setProperty('--echo-dx', `${directionX * followDistance}px`);
            echo.style.setProperty('--echo-dy', `${directionY * followDistance}px`);
            echo.style.setProperty('--echo-duration', `${duration}s`);
            document.body.appendChild(echo);
            echo.addEventListener('animationend', () => echo.remove(), { once: true });
        };

        const emitEchoesAlongPath = (x, y, force = false) => {
            const now = performance.now();
            const timeDelta = Math.max(16, now - lastMoveTimestamp);

            if (force || lastEchoX === null || lastEchoY === null) {
                createPointerEcho(x, y, lastMoveVectorX, lastMoveVectorY, 0);
                lastEchoX = x;
                lastEchoY = y;
                lastMoveTimestamp = now;
                return;
            }

            const originX = lastEchoX;
            const originY = lastEchoY;
            const dx = x - originX;
            const dy = y - originY;
            const distance = Math.hypot(dx, dy);
            const speed = distance / timeDelta;
            const baseSpacing = touchActive ? touchBaseSpacing : desktopBaseSpacing;
            const spacing = Math.max(minEchoSpacing, baseSpacing - Math.min(6, speed * 8));

            lastMoveVectorX = dx;
            lastMoveVectorY = dy;

            if (distance < spacing) {
                lastMoveTimestamp = now;
                return;
            }

            const steps = Math.floor(distance / spacing);
            for (let step = 1; step <= steps; step++) {
                const travelled = step * spacing;
                const progress = travelled / distance;
                createPointerEcho(originX + dx * progress, originY + dy * progress, dx, dy, speed * 100);
            }

            const travelledDistance = steps * spacing;
            const finalProgress = travelledDistance / distance;
            lastEchoX = originX + dx * finalProgress;
            lastEchoY = originY + dy * finalProgress;
            lastMoveTimestamp = now;
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
                emitEchoesAlongPath(x, y, forceEcho);
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
                lastEchoX = null;
                lastEchoY = null;
                lastMoveVectorX = 0;
                lastMoveVectorY = 0;
                lastMoveTimestamp = performance.now();
                setPointerTarget(touch.clientX, touch.clientY, { echo: true, forceEcho: true });
            };

            const handleTouchMove = (event) => {
                const touch = event.touches[0];
                if (!touch) return;
                setPointerTarget(touch.clientX, touch.clientY, { echo: true, forceEcho: false });
            };

            const handleTouchEnd = () => {
                touchActive = false;
                lastEchoX = null;
                lastEchoY = null;
                lastMoveVectorX = 0;
                lastMoveVectorY = 0;
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

            document.addEventListener('mouseleave', () => {
                lastEchoX = null;
                lastEchoY = null;
                lastMoveVectorX = 0;
                lastMoveVectorY = 0;
                hideLeader();
            });
            document.addEventListener('mouseenter', () => {
                lastEchoX = null;
                lastEchoY = null;
                lastMoveTimestamp = performance.now();
                showLeader();
            });
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

    const baseServiceTags = [
        'Branding',
        'Animation',
        'Brand Strategy',
        'Ads Management',
        'Community Management',
        'SEO',
        'Content Creation',
        'Copywriting',
        'Photography',
        'Videography',
        'Social Media Strategies',
        'Publications',
        'Illustrations',
        'Packaging',
        'Website Design & Development'
    ];

    const hiddenFilterTags = [
        'Ads Management',
        'Brand Strategy',
        'Community Management',
        'Content Creation',
        'Copywriting',
        'Menu Design',
        'SEO'
    ];

    const normalizeTag = (tag = '') => tag.trim().toLowerCase().replace(/\s+/g, ' ');
    const hiddenFilterSet = new Set(hiddenFilterTags.map(tag => normalizeTag(tag)));

    const tagDisplayMap = new Map(baseServiceTags.map(tag => [normalizeTag(tag), tag]));

    const getTagLabel = (tag = '') => {
        const normalized = normalizeTag(tag);
        if (!normalized) return '';
        if (tagDisplayMap.has(normalized)) return tagDisplayMap.get(normalized);
        const cleaned = tag.trim().replace(/\s+/g, ' ');
        const titleCased = cleaned.split(' ').map(word => {
            if (word.toUpperCase() === word) return word;
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
        tagDisplayMap.set(normalized, titleCased);
        return titleCased;
    };

    const createFilterTagLink = (tag) => {
        const label = getTagLabel(tag);
        const href = `work.html?filter=${encodeURIComponent(label)}`;
        return `<a class="tag-link" href="${href}" data-filter-tag="${label}">${label}</a>`;
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
            const projectItem = document.createElement('article');
            projectItem.className = `work-item ${isLarge ? 'work-item-large' : ''}`;

            const tagsHTML = project.tags.map(tag => createFilterTagLink(tag)).join('');

            let mediaHTML = '';
            if (isVideo(project.thumbnail)) {
                mediaHTML = `
                    <video autoplay loop muted playsinline class="work-img">
                        <source src="${project.thumbnail}" type="video/mp4">
                    </video>`;
            } else {
                mediaHTML = `<img src="${project.thumbnail}" alt="${project.title} Project Thumbnail" class="work-img">`;
            }

            projectItem.innerHTML = `
                <a class="work-item-link" href="project.html?id=${encodeURIComponent(project.id)}" aria-label="View ${project.title} project"></a>
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

    function populateWorkList(projects, activeFilter = 'all') {
        if (!workPageList) return;
        workPageList.innerHTML = '';

        const normalizedFilter = activeFilter === 'all' ? 'all' : normalizeTag(activeFilter);
        const visibleProjects = normalizedFilter === 'all'
            ? projects
            : projects.filter(project => project.tags.some(tag => normalizeTag(tag) === normalizedFilter));

        if (!visibleProjects.length) {
            const emptyState = document.createElement('div');
            emptyState.className = 'project-filter-empty';
            emptyState.innerHTML = `
                <h3>No projects yet for ${getTagLabel(activeFilter)}</h3>
                <p>Try another service or switch back to all work.</p>
            `;
            workPageList.appendChild(emptyState);
            return;
        }

        visibleProjects.forEach(project => {
            const projectItem = document.createElement('a');
            projectItem.href = `project.html?id=${encodeURIComponent(project.id)}`;
            projectItem.className = 'project-item';

            if (!isVideo(project.thumbnail)) {
                projectItem.dataset.image = project.thumbnail;
            }

            const tagsHTML = project.tags.map(tag => `<span>${getTagLabel(tag)}</span>`).join('');

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
        const projectId = decodeURIComponent(urlParams.get('id') || '');
        const project = projects.find(p => p.id === projectId);

        if (project) {
            document.title = `${project.title} - Sada Studio`;
            const tagsHTML = project.tags.map(tag => createFilterTagLink(tag)).join('');

            const imagesHTML = project.images.map(mediaSrc => {
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

    function setupWorkFilters(projects) {
        const filterToolbar = document.getElementById('work-filter-toolbar');
        const filterToggle = document.getElementById('work-filter-toggle');
        const filterPanel = document.getElementById('work-filter-panel');
        const currentLabel = document.getElementById('filter-current-label');
        if (!filterToolbar || !filterToggle || !filterPanel || !currentLabel || !workPageList) return;

        const serviceMap = new Map();
        [...baseServiceTags, ...projects.flatMap(project => project.tags)].forEach(tag => {
            const normalized = normalizeTag(tag);
            if (!normalized || hiddenFilterSet.has(normalized) || serviceMap.has(normalized)) return;
            serviceMap.set(normalized, getTagLabel(tag));
        });

        const urlParams = new URLSearchParams(window.location.search);
        const requestedFilter = urlParams.get('filter');
        let activeFilter = requestedFilter ? getTagLabel(requestedFilter) : 'All';

        if (
            normalizeTag(activeFilter) !== 'all' &&
            !hiddenFilterSet.has(normalizeTag(activeFilter)) &&
            !serviceMap.has(normalizeTag(activeFilter))
        ) {
            serviceMap.set(normalizeTag(activeFilter), getTagLabel(activeFilter));
        }

        const sortedServices = Array.from(serviceMap.values()).sort((a, b) => a.localeCompare(b));
        const filterLabels = ['All', ...sortedServices];

        const closeFilterPanel = () => {
            filterToolbar.classList.remove('open');
            filterToggle.setAttribute('aria-expanded', 'false');
        };

        const updateFilterQuery = (label) => {
            const nextUrl = new URL(window.location.href);
            if (normalizeTag(label) === 'all') {
                nextUrl.searchParams.delete('filter');
            } else {
                nextUrl.searchParams.set('filter', label);
            }
            history.replaceState({}, '', nextUrl);
        };

        const renderFilterButtons = () => {
            filterPanel.innerHTML = filterLabels.map(label => {
                const isActive = normalizeTag(label) === normalizeTag(activeFilter);
                return `<button type="button" class="filter-chip ${isActive ? 'active' : ''}" data-filter-value="${label}">${label}</button>`;
            }).join('');
            currentLabel.textContent = normalizeTag(activeFilter) === 'all' ? 'All services' : activeFilter;
            filterToggle.classList.toggle('has-active-filter', normalizeTag(activeFilter) !== 'all');
            populateWorkList(projects, normalizeTag(activeFilter) === 'all' ? 'all' : activeFilter);
        };

        filterToggle.addEventListener('click', () => {
            const willOpen = !filterToolbar.classList.contains('open');
            filterToolbar.classList.toggle('open', willOpen);
            filterToggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        });

        filterPanel.addEventListener('click', (event) => {
            const filterButton = event.target.closest('.filter-chip');
            if (!filterButton) return;
            activeFilter = filterButton.dataset.filterValue;
            renderFilterButtons();
            updateFilterQuery(activeFilter);
            closeFilterPanel();
        });

        document.addEventListener('click', (event) => {
            if (!filterToolbar.contains(event.target)) {
                closeFilterPanel();
            }
        });

        renderFilterButtons();
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
                projectDetailContainer.innerHTML = `<div class="not-found"><h1>Error</h1><p>Could not load project data. Please try again later.</p></div>`;
            }
            return;
        }

        populateFeaturedGrid(projects);
        setupWorkFilters(projects);
        if (!workPageList) {
            populateWorkList(projects);
        }
        populateProjectDetail(projects);
    }

    initializePage();
});