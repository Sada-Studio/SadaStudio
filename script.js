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
            if (header) header.classList.remove('header-hidden');
            document.body.style.overflow = '';
        };
        menuToggle.addEventListener('click', () => {
            fullScreenNav.classList.add('active');
            menuToggle.classList.add('active');
            if (header) header.classList.remove('header-hidden');
            document.body.style.overflow = 'hidden';
        });
        closeNavButton.addEventListener('click', closeMenu);
        navLinkItems.forEach(link => link.addEventListener('click', closeMenu));
    }

    // --- Header Background + Hide on Scroll Down ---
    if (header) {
        let lastHeaderScrollY = window.scrollY;
        let headerTicking = false;
        const HIDE_THRESHOLD = 10;

        const updateHeaderState = () => {
            const currentScrollY = window.scrollY;
            const scrollDelta = currentScrollY - lastHeaderScrollY;

            header.classList.toggle('scrolled', currentScrollY > 50);

            if (fullScreenNav && fullScreenNav.classList.contains('active')) {
                header.classList.remove('header-hidden');
            } else if (currentScrollY <= 24) {
                header.classList.remove('header-hidden');
            } else if (scrollDelta > HIDE_THRESHOLD) {
                header.classList.add('header-hidden');
            } else if (scrollDelta < -6) {
                header.classList.remove('header-hidden');
            }

            lastHeaderScrollY = currentScrollY;
            headerTicking = false;
        };

        updateHeaderState();
        window.addEventListener('scroll', () => {
            if (headerTicking) return;
            headerTicking = true;
            requestAnimationFrame(updateHeaderState);
        }, { passive: true });
    }

    // --- Dots Background Inertia ---
    const dotsBackground = document.getElementById('dots-background');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (dotsBackground && !prefersReducedMotion) {
        const SCROLL_MULTIPLIER = 1.03;
        const MOMENTUM_PUSH = 0.16;
        const MOMENTUM_DECAY = 0.89;
        const OFFSET_DECAY = 0.94;

        let baseOffset = -window.scrollY * SCROLL_MULTIPLIER;
        let momentumOffset = 0;
        let momentumVelocity = 0;
        let renderedOffset = baseOffset;
        let lastFrameTime = performance.now();
        let lastScrollY = window.scrollY;
        let dotsRaf = null;

        const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

        const applyDotsState = () => {
            renderedOffset = baseOffset + momentumOffset;
            dotsBackground.style.backgroundPosition = `0px ${renderedOffset.toFixed(2)}px`;
            const blurAmount = clamp(Math.abs(momentumVelocity) * 0.022, 0, 0.3);
            dotsBackground.style.filter = `blur(${blurAmount.toFixed(2)}px)`;
        };

        const animateDots = (now) => {
            const deltaFactor = Math.min(2.25, (now - lastFrameTime) / 16.6667 || 1);
            lastFrameTime = now;

            momentumOffset += momentumVelocity * deltaFactor;
            momentumVelocity *= Math.pow(MOMENTUM_DECAY, deltaFactor);
            momentumOffset *= Math.pow(OFFSET_DECAY, deltaFactor);

            applyDotsState();

            if (Math.abs(momentumOffset) > 0.08 || Math.abs(momentumVelocity) > 0.02) {
                dotsRaf = requestAnimationFrame(animateDots);
            } else {
                momentumOffset = 0;
                momentumVelocity = 0;
                dotsRaf = null;
                applyDotsState();
            }
        };

        const kickDotsAnimation = () => {
            if (dotsRaf) return;
            lastFrameTime = performance.now();
            dotsRaf = requestAnimationFrame(animateDots);
        };

        const handleDotsScroll = () => {
            const currentScrollY = window.scrollY;
            const scrollDelta = currentScrollY - lastScrollY;

            baseOffset = -currentScrollY * SCROLL_MULTIPLIER;
            momentumVelocity += -scrollDelta * MOMENTUM_PUSH;
            lastScrollY = currentScrollY;

            applyDotsState();
            kickDotsAnimation();
        };

        const handleDotsResize = () => {
            baseOffset = -window.scrollY * SCROLL_MULTIPLIER;
            applyDotsState();
        };

        applyDotsState();
        window.addEventListener('scroll', handleDotsScroll, { passive: true });
        window.addEventListener('resize', handleDotsResize);
    } else if (dotsBackground) {
        dotsBackground.style.backgroundPosition = '0px 0px';
        dotsBackground.style.filter = 'none';
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
    const trailCursors = Array.from(document.querySelectorAll('.cursor-trail')).slice(0, 5);
    if (cursors.length > 0 && leaderCursor) {
        const isTouchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches || 'ontouchstart' in window;

        let pointerX = window.innerWidth / 2;
        let pointerY = window.innerHeight / 2;
        let cursorX = pointerX;
        let cursorY = pointerY;
        let touchActive = false;
        let cursorVisible = !isTouchDevice;
        let touchHideTimeout = null;

        const trailStates = trailCursors.map((_, index) => ({
            x: pointerX,
            y: pointerY,
            opacity: Math.max(0, 0.42 - index * 0.065)
        }));

        const syncTrailPositions = (x, y) => {
            trailStates.forEach((state) => {
                state.x = x;
                state.y = y;
            });
        };

        const setTouchCursorState = (isActive) => {
            document.body.classList.toggle('touch-cursor-active', isActive);
        };

        const showCursorSystem = () => {
            cursorVisible = true;
            leaderCursor.style.display = 'block';
            if (isTouchDevice) {
                setTouchCursorState(true);
            }
        };

        const hideCursorSystem = (forceTouchHide = false) => {
            cursorVisible = false;
            leaderCursor.style.opacity = '0';
            trailCursors.forEach((trail) => {
                trail.style.opacity = '0';
            });
            if (isTouchDevice && (forceTouchHide || !touchActive)) {
                setTouchCursorState(false);
            }
        };

        const resetCursorSystem = () => {
            touchActive = false;
            if (touchHideTimeout) {
                clearTimeout(touchHideTimeout);
                touchHideTimeout = null;
            }
            hideCursorSystem(true);
        };

        const setPointerTarget = (x, y, immediate = false) => {
            pointerX = x;
            pointerY = y;
            showCursorSystem();

            if (immediate) {
                cursorX = x;
                cursorY = y;
                syncTrailPositions(x, y);
            }
        };

        if (isTouchDevice) {
            document.body.style.cursor = 'auto';
            resetCursorSystem();

            const handleTouchStart = (event) => {
                const touch = event.touches[0];
                if (!touch) return;
                if (touchHideTimeout) {
                    clearTimeout(touchHideTimeout);
                    touchHideTimeout = null;
                }
                touchActive = true;
                setPointerTarget(touch.clientX, touch.clientY, true);
            };

            const handleTouchMove = (event) => {
                const touch = event.touches[0];
                if (!touch) return;
                setPointerTarget(touch.clientX, touch.clientY, false);
            };

            const handleTouchEnd = () => {
                touchActive = false;
                if (touchHideTimeout) clearTimeout(touchHideTimeout);
                touchHideTimeout = setTimeout(() => {
                    hideCursorSystem(true);
                }, 90);
            };

            window.addEventListener('touchstart', handleTouchStart, { passive: true });
            window.addEventListener('touchmove', handleTouchMove, { passive: true });
            window.addEventListener('touchend', handleTouchEnd, { passive: true });
            window.addEventListener('touchcancel', handleTouchEnd, { passive: true });
            window.addEventListener('pageshow', resetCursorSystem);
            window.addEventListener('pagehide', resetCursorSystem);
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) resetCursorSystem();
            });
        } else {
            window.addEventListener('mousemove', (event) => {
                setPointerTarget(event.clientX, event.clientY, false);
            });

            document.addEventListener('mouseleave', () => {
                hideCursorSystem();
            });

            document.addEventListener('mouseenter', (event) => {
                setPointerTarget(event.clientX, event.clientY, true);
            });
        }

        function animateLeaderCursor() {
            const leaderEase = touchActive ? 0.30 : 0.22;
            cursorX += (pointerX - cursorX) * leaderEase;
            cursorY += (pointerY - cursorY) * leaderEase;

            leaderCursor.style.transform = `translate3d(${cursorX - leaderCursor.offsetWidth / 2}px, ${cursorY - leaderCursor.offsetHeight / 2}px, 0)`;
            leaderCursor.style.opacity = cursorVisible ? '1' : '0';

            let followX = cursorX;
            let followY = cursorY;
            trailStates.forEach((state, index) => {
                const ease = Math.max(touchActive ? 0.12 : 0.10, (touchActive ? 0.22 : 0.18) - index * 0.017);
                state.x += (followX - state.x) * ease;
                state.y += (followY - state.y) * ease;
                followX = state.x;
                followY = state.y;

                const trail = trailCursors[index];
                if (trail) {
                    const scale = Math.max(0.84, 0.98 - index * 0.022);
                    const opacity = cursorVisible ? Math.max(0, 0.40 - index * 0.065) : 0;
                    trail.style.transform = `translate3d(${state.x - trail.offsetWidth / 2}px, ${state.y - trail.offsetHeight / 2}px, 0) scale(${scale})`;
                    trail.style.opacity = `${opacity}`;
                }
            });

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
        const currentCount = document.getElementById('filter-current-count');
        if (!filterToolbar || !filterToggle || !filterPanel || !currentLabel || !currentCount || !workPageList) return;

        const serviceMap = new Map();
        const visibleServiceCounts = new Map();
        const allServiceCounts = new Map();

        projects.forEach(project => {
            const uniqueTags = new Set((project.tags || []).map(tag => normalizeTag(tag)).filter(Boolean));

            uniqueTags.forEach(normalized => {
                const originalTag = (project.tags || []).find(tag => normalizeTag(tag) === normalized) || normalized;
                allServiceCounts.set(normalized, (allServiceCounts.get(normalized) || 0) + 1);

                if (hiddenFilterSet.has(normalized)) return;

                if (!serviceMap.has(normalized)) {
                    serviceMap.set(normalized, getTagLabel(originalTag));
                }

                visibleServiceCounts.set(normalized, (visibleServiceCounts.get(normalized) || 0) + 1);
            });
        });

        baseServiceTags.forEach(tag => {
            const normalized = normalizeTag(tag);
            if (!normalized || hiddenFilterSet.has(normalized)) return;

            if (!serviceMap.has(normalized)) {
                serviceMap.set(normalized, getTagLabel(tag));
            }

            if (!visibleServiceCounts.has(normalized)) {
                visibleServiceCounts.set(normalized, 0);
            }

            if (!allServiceCounts.has(normalized)) {
                allServiceCounts.set(normalized, 0);
            }
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
            visibleServiceCounts.set(normalizeTag(activeFilter), allServiceCounts.get(normalizeTag(activeFilter)) || 0);
        }

        const sortedServices = Array.from(serviceMap.entries())
            .sort((a, b) => {
                const countDifference = (visibleServiceCounts.get(b[0]) || 0) - (visibleServiceCounts.get(a[0]) || 0);
                if (countDifference !== 0) return countDifference;
                return a[1].localeCompare(b[1]);
            })
            .map(([, label]) => label);

        const filterLabels = ['All', ...sortedServices];

        const getCountForLabel = (label) => {
            const normalized = normalizeTag(label);
            if (normalized === 'all') return projects.length;
            return allServiceCounts.get(normalized) || 0;
        };

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
                const normalized = normalizeTag(label);
                const isActive = normalized === normalizeTag(activeFilter);
                const chipLabel = normalized === 'all' ? 'All work' : label;
                const chipCount = getCountForLabel(label);

                return `
                    <button
                        type="button"
                        class="filter-chip ${isActive ? 'active' : ''}"
                        data-filter-value="${label}"
                        aria-pressed="${isActive ? 'true' : 'false'}"
                    >
                        <span class="filter-chip-label">${chipLabel}</span>
                        <span class="filter-chip-count">${chipCount}</span>
                    </button>
                `;
            }).join('');

            const normalizedActive = normalizeTag(activeFilter);
            const isAll = normalizedActive === 'all';
            currentLabel.textContent = isAll ? 'All work' : activeFilter;
            currentCount.textContent = `${getCountForLabel(activeFilter)}`;
            filterToggle.classList.toggle('has-active-filter', !isAll);
            filterToggle.classList.toggle('is-all-filter', isAll);

            populateWorkList(projects, isAll ? 'all' : activeFilter);
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

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeFilterPanel();
            }
        });

        renderFilterButtons();
    }
    // --- WORK PAGE THUMBNAIL HOVER LOGIC ---
    const thumbnailViewer = document.getElementById('project-thumbnail-viewer');

    if (workPageList && thumbnailViewer) {
        const hasTouchInput = (navigator.maxTouchPoints || 0) > 0
            || window.matchMedia('(hover: none), (pointer: coarse)').matches
            || 'ontouchstart' in window;
        const canHoverPreview = !hasTouchInput && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        let mouseX = 0, mouseY = 0;
        let lastMouseX = 0;
        let rotation = 0;
        let animationFrameId = null;

        let activeTouchPreviewItem = null;
        let suppressNextTapClickFor = null;
        let touchMoved = false;
        let touchStartX = 0;
        let touchStartY = 0;

        const stopThumbnailAnimation = () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        };

        const clearActiveTouchPreview = () => {
            if (activeTouchPreviewItem) {
                activeTouchPreviewItem.classList.remove('preview-active');
                activeTouchPreviewItem = null;
            }
        };

        const hideThumbnailViewer = () => {
            thumbnailViewer.classList.remove('visible', 'touch-preview-mode');
            thumbnailViewer.style.backgroundImage = '';
            thumbnailViewer.style.transform = '';
            stopThumbnailAnimation();
            rotation = 0;
            clearActiveTouchPreview();
            suppressNextTapClickFor = null;
        };

        const showTouchThumbnailPreview = (projectItem) => {
            if (!projectItem || !projectItem.dataset.image) return false;
            clearActiveTouchPreview();
            activeTouchPreviewItem = projectItem;
            activeTouchPreviewItem.classList.add('preview-active');
            thumbnailViewer.style.backgroundImage = `url(${projectItem.dataset.image})`;
            thumbnailViewer.style.transform = '';
            thumbnailViewer.classList.add('touch-preview-mode', 'visible');
            return true;
        };

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

        window.addEventListener('pageshow', hideThumbnailViewer);
        window.addEventListener('pagehide', hideThumbnailViewer);
        window.addEventListener('blur', hideThumbnailViewer);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) hideThumbnailViewer();
        });

        if (canHoverPreview) {
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
                stopThumbnailAnimation();
                animate();
            });

            workPageList.addEventListener('mouseleave', hideThumbnailViewer);
        } else {
            hideThumbnailViewer();

            workPageList.addEventListener('touchstart', (event) => {
                const projectItem = event.target.closest('.project-item');
                touchMoved = false;

                if (event.touches && event.touches[0]) {
                    touchStartX = event.touches[0].clientX;
                    touchStartY = event.touches[0].clientY;
                }

                if (!projectItem) return;

                if (!projectItem.dataset.image) {
                    hideThumbnailViewer();
                    return;
                }

                if (activeTouchPreviewItem !== projectItem) {
                    event.preventDefault();
                    showTouchThumbnailPreview(projectItem);
                    suppressNextTapClickFor = projectItem;
                } else {
                    suppressNextTapClickFor = null;
                }
            }, { passive: false });

            workPageList.addEventListener('touchmove', (event) => {
                if (!event.touches || !event.touches[0]) return;
                const moveX = Math.abs(event.touches[0].clientX - touchStartX);
                const moveY = Math.abs(event.touches[0].clientY - touchStartY);
                if (moveX > 10 || moveY > 10) {
                    touchMoved = true;
                }
            }, { passive: true });

            workPageList.addEventListener('click', (event) => {
                const projectItem = event.target.closest('.project-item');
                if (!projectItem) return;

                if (!projectItem.dataset.image) {
                    hideThumbnailViewer();
                    return;
                }

                if (touchMoved) {
                    event.preventDefault();
                    return;
                }

                if (suppressNextTapClickFor === projectItem || activeTouchPreviewItem !== projectItem) {
                    event.preventDefault();
                    event.stopPropagation();
                    showTouchThumbnailPreview(projectItem);
                    suppressNextTapClickFor = null;
                    return;
                }

                hideThumbnailViewer();
            }, true);

            document.addEventListener('click', (event) => {
                const clickedInsideList = workPageList.contains(event.target);
                const clickedPreview = thumbnailViewer.contains(event.target);
                if (!clickedInsideList && !clickedPreview) {
                    hideThumbnailViewer();
                }
            });

            window.addEventListener('scroll', () => {
                if (activeTouchPreviewItem) {
                    hideThumbnailViewer();
                }
            }, { passive: true });
        }
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