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
    if (window.location.pathname.endsWith('/index.html')) {
        const homepageUrl = new URL(window.location.href);
        homepageUrl.pathname = homepageUrl.pathname.slice(0, -'index.html'.length);
        window.history.replaceState(window.history.state, '', homepageUrl);
    }

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
    
    // --- Scroll Motion Cues ---
    const setupScrollMotionCues = () => {
        if (
            prefersReducedMotion ||
            document.querySelector('.project-page-main')
        ) {
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.className = 'scroll-motion-cues';
        canvas.setAttribute('aria-hidden', 'true');
        document.body.appendChild(canvas);

        const context = canvas.getContext('2d');

        if (!context) {
            canvas.remove();
            return;
        }

        const clampCueValue = (value, min, max) =>
            Math.min(max, Math.max(min, value));
        const wrapCueValue = (value, span) =>
            ((value % span) + span) % span;

        let viewportWidth = 0;
        let viewportHeight = 0;
        let deviceScale = 1;
        let cues = [];
        let travel = 0;
        let velocity = 0;
        let lastCueScrollY = window.scrollY;
        let lastCueFrame = performance.now();
        let motionFrame = null;

        const buildCues = () => {
            const countPerSide = viewportWidth < 600 ? 5 : 7;
            const edgeRange = viewportWidth < 600 ? 18 : 38;
            const minimumInset = viewportWidth < 600 ? 10 : 16;
            cues = [];

            ['left', 'right'].forEach((side, sideIndex) => {
                for (let index = 0; index < countPerSide; index += 1) {
                    cues.push({
                        side,
                        baseY: ((index + 0.5) / countPerSide) * viewportHeight,
                        inset:
                            minimumInset +
                            ((index * 11 + sideIndex * 7) % edgeRange),
                        radius:
                            (viewportWidth < 600 ? 2.4 : 3.1) +
                            ((index * 5 + sideIndex * 3) % 6) * 0.7,
                        speed: 0.68 + ((index * 3 + sideIndex) % 5) * 0.11,
                        phase: index * 1.37 + sideIndex * 0.73,
                    });
                }
            });
        };

        const resizeMotionCues = () => {
            viewportWidth = window.innerWidth;
            viewportHeight = window.innerHeight;
            deviceScale = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(viewportWidth * deviceScale);
            canvas.height = Math.round(viewportHeight * deviceScale);
            canvas.style.width = viewportWidth + 'px';
            canvas.style.height = viewportHeight + 'px';
            context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
            buildCues();
            drawMotionCues();
        };

        const drawMotionCues = () => {
            const edgeFadeDistance = viewportWidth < 600 ? 56 : 84;
            const outsideMargin = edgeFadeDistance;
            const verticalSpan = viewportHeight + outsideMargin * 2;

            context.clearRect(0, 0, viewportWidth, viewportHeight);
            context.fillStyle = '#ffffff';

            cues.forEach(cue => {
                const wrappedY =
                    wrapCueValue(
                        cue.baseY + travel * cue.speed + outsideMargin,
                        verticalSpan
                    ) - outsideMargin;
                const distanceFromBoundary = Math.min(
                    wrappedY + outsideMargin,
                    viewportHeight + outsideMargin - wrappedY
                );
                const edgeScale = clampCueValue(
                    distanceFromBoundary / edgeFadeDistance,
                    0,
                    1
                );
                const pulse =
                    0.84 +
                    Math.sin(travel * 0.018 * cue.speed + cue.phase) * 0.16;
                const radius = cue.radius * edgeScale * pulse;

                if (radius < 0.12) {
                    return;
                }

                const x =
                    cue.side === 'left'
                        ? cue.inset
                        : viewportWidth - cue.inset;

                context.globalAlpha =
                    (0.24 + edgeScale * 0.42) * edgeScale;
                context.beginPath();
                context.arc(x, wrappedY, radius, 0, Math.PI * 2);
                context.fill();
            });

            context.globalAlpha = 1;
        };

        const animateMotionCues = now => {
            const frameFactor = Math.min(
                2.25,
                (now - lastCueFrame) / 16.6667 || 1
            );
            lastCueFrame = now;
            travel += velocity * frameFactor;
            velocity *= Math.pow(0.91, frameFactor);
            drawMotionCues();

            if (Math.abs(velocity) > 0.025) {
                motionFrame = requestAnimationFrame(animateMotionCues);
            } else {
                velocity = 0;
                motionFrame = null;
            }
        };

        const startMotionCueFrame = () => {
            if (motionFrame) {
                return;
            }

            lastCueFrame = performance.now();
            motionFrame = requestAnimationFrame(animateMotionCues);
        };

        const handleMotionCueScroll = () => {
            const currentScrollY = window.scrollY;
            const scrollDelta = currentScrollY - lastCueScrollY;
            lastCueScrollY = currentScrollY;
            velocity = clampCueValue(
                velocity - scrollDelta * 0.095,
                -18,
                18
            );
            startMotionCueFrame();
        };

        resizeMotionCues();
        window.addEventListener('scroll', handleMotionCueScroll, {
            passive: true,
        });
        window.addEventListener('resize', resizeMotionCues);
    };

    setupScrollMotionCues();

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

    // GIFs remain images; MP4 and WebM are handled as playable video.
    const isVideo = (filename) =>
        /\.(mp4|webm)(?:[?#].*)?$/i.test(String(filename || ''));

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

    const sanitizeMediaList = (media = []) => {
        return [...new Map(
            (Array.isArray(media) ? media : [])
                .map(item => (item || '').trim())
                .filter(Boolean)
                .map(item => [item.toLowerCase(), item])
        ).values()];
    };
let currentSiteContent = null;
function waitForSiteContentPreview() {
    const parameters = new URLSearchParams(window.location.search);

    const isPreview =
        parameters.get('cmsPreview') === '1' &&
        window.parent !== window;

    if (!isPreview) {
        return Promise.resolve(null);
    }

    return new Promise(resolve => {
        let finished = false;

        const finish = content => {
            if (finished) {
                return;
            }

            finished = true;
            window.clearTimeout(timeout);
            window.removeEventListener('message', receivePreview);
            resolve(content);
        };

        const receivePreview = event => {
            if (event.origin !== 'https://admin.sadastudio.me') {
                return;
            }

            const message = event.data;

            if (
                !message ||
                message.type !== 'sada-site-content-preview' ||
                !message.content ||
                typeof message.content !== 'object'
            ) {
                return;
            }

            finish(message.content);
        };

        const timeout = window.setTimeout(() => {
            finish(null);
        }, 5000);

        window.addEventListener('message', receivePreview);

        window.parent.postMessage(
            {
                type: 'sada-site-content-preview-ready'
            },
            'https://admin.sadastudio.me'
        );
    });
}
async function fetchSiteContent() {
        const previewContent = await waitForSiteContentPreview();

    if (previewContent) {
        return previewContent;
    }
    try {
        const response = await fetch('site-content.json', {
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(
                `Could not load website content: ${response.status}`
            );
        }

        const content = await response.json();

        if (!content || typeof content !== 'object') {
            throw new Error('Website content is invalid.');
        }

        return content;
    } catch (error) {
        console.warn('Website content could not be loaded:', error);
        return null;
    }
}

function setSiteText(selector, value) {
    if (typeof value !== 'string') {
        return;
    }

    document.querySelectorAll(selector).forEach(element => {
        element.textContent = value;
    });
}

function replaceSiteParagraphs(container, paragraphs, insertBefore = null) {
    if (!container || !Array.isArray(paragraphs)) {
        return;
    }

    Array.from(container.children)
        .filter(element => element.tagName === 'P')
        .forEach(element => element.remove());

    paragraphs.forEach(value => {
        if (typeof value !== 'string' || !value.trim()) {
            return;
        }

        const paragraph = document.createElement('p');

        paragraph.textContent = value;

        if (insertBefore) {
            container.insertBefore(paragraph, insertBefore);
        } else {
            container.appendChild(paragraph);
        }
    });
}

function setSiteMeta(attribute, name, content) {
    if (typeof content !== 'string') {
        return;
    }

    let element = document.head.querySelector(
        `meta[${attribute}="${name}"]`
    );

    if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
    }

    element.setAttribute('content', content);
}

function applyPageSeo(seo) {
    if (!seo || typeof seo !== 'object') {
        return;
    }

    const title = String(seo.title || '').trim();
    const description = String(seo.description || '').trim();

    if (title) {
        document.title = title;

        setSiteMeta('property', 'og:title', title);
        setSiteMeta('name', 'twitter:title', title);
    }

    if (description) {
        setSiteMeta('name', 'description', description);
        setSiteMeta('property', 'og:description', description);
        setSiteMeta('name', 'twitter:description', description);
    }

    setSiteMeta('property', 'og:type', 'website');
    setSiteMeta('property', 'og:site_name', 'Sada Studio');
    setSiteMeta('property', 'og:url', window.location.href);
    setSiteMeta('name', 'twitter:card', 'summary_large_image');

    const image = 'https://assets.sadastudio.me/site/web_logo.png';

    setSiteMeta('property', 'og:image', image);
    setSiteMeta('name', 'twitter:image', image);
}

function updateFooterTagline(tagline) {
    const container = document.querySelector('.footer-tagline');

    if (!container || !tagline || typeof tagline !== 'object') {
        return;
    }

    const before = String(tagline.before || '').trim();
    const highlight = String(tagline.highlight || '').trim();
    const after = String(tagline.after || '').trim();

    container.replaceChildren();

    if (before) {
        container.appendChild(document.createTextNode(before));
    }

    if (highlight) {
        if (before) {
            container.appendChild(document.createTextNode(' '));
        }

        const animatedWord = document.createElement('span');
        const strong = document.createElement('strong');

        animatedWord.className = 'sonar-word';
        strong.textContent = highlight;

        animatedWord.appendChild(strong);
        container.appendChild(animatedWord);
    }

    if (after) {
        if (before || highlight) {
            container.appendChild(document.createTextNode(' '));
        }

        container.appendChild(document.createTextNode(after));
    }
}

function updateFooterLinks(footer) {
    if (!footer || typeof footer !== 'object') {
        return;
    }

    const emailLink = document.querySelector('.footer-email-link');

    if (emailLink && footer.email) {
        emailLink.textContent = footer.email;
        emailLink.href = `mailto:${footer.email}`;
    }

    const socialContainer = document.querySelector(
        '.footer-social-links'
    );

    if (!socialContainer || !Array.isArray(footer.socialLinks)) {
        return;
    }

    socialContainer.replaceChildren();

    footer.socialLinks.forEach(item => {
        if (!item || !item.label || !item.url) {
            return;
        }

        let address;

        try {
            address = new URL(item.url);

            if (
                address.protocol !== 'https:' &&
                address.protocol !== 'http:'
            ) {
                return;
            }
        } catch {
            return;
        }

        const link = document.createElement('a');

        link.textContent = item.label;
        link.href = address.href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        socialContainer.appendChild(link);
    });

    if (footer.phone && footer.phone.number) {
        const phoneLink = document.createElement('a');

        phoneLink.textContent =
            footer.phone.label || footer.phone.number;

        phoneLink.href = `tel:${footer.phone.number}`;

        socialContainer.appendChild(phoneLink);
    }
}

function applySiteContent(content) {
    if (!content || typeof content !== 'object') {
        return;
    }

    currentSiteContent = content;

    const navigation = content.navigation || {};

    setSiteText('.menu-text', navigation.menuLabel);

    document.querySelectorAll('.nav-link-item').forEach(link => {
        const destination = link.getAttribute('href') || '';

        if (destination === 'work.html') {
            link.textContent = navigation.workLabel || link.textContent;
        } else if (destination === '/' || destination === 'index.html') {
            link.textContent = navigation.homeLabel || link.textContent;
        } else if (destination.includes('#about')) {
            link.textContent = navigation.aboutLabel || link.textContent;
        } else if (destination === '#contact') {
            link.textContent = navigation.contactLabel || link.textContent;
        }
    });

    const homepage = content.homepage || {};

    if (document.querySelector('.hero-section')) {
        applyPageSeo(homepage.seo);

        setSiteText('.scroll-text', homepage.scrollLabel);

        setSiteText(
            '.work-heading .main-heading',
            homepage.featuredHeading
        );

        setSiteText(
            '.work-heading .tagline',
            homepage.featuredTagline
        );

        const callToAction = homepage.callToAction || {};
        const callout = document.querySelector('.bottom-cta-text');

        if (callout) {
            const button = callout.querySelector('a');

            if (button) {
                const buttonText = button.querySelector('span');

                if (buttonText && callToAction.button) {
                    buttonText.textContent = callToAction.button;
                }

                callout.replaceChildren(
                    document.createTextNode(
                        `${callToAction.before || ''} `
                    ),
                    button,
                    document.createTextNode(
                        ` ${callToAction.after || ''}`
                    )
                );
            }
        }

        setSiteText('.about-text h2', homepage.aboutHeading);

        const aboutText = document.querySelector('.about-text');

        const serviceTags = document.querySelector(
            '.about-service-tags'
        );

        replaceSiteParagraphs(
            aboutText,
            homepage.aboutParagraphs,
            serviceTags
        );

        if (serviceTags && Array.isArray(homepage.services)) {
            serviceTags.replaceChildren();

            homepage.services.forEach(service => {
                if (typeof service !== 'string' || !service.trim()) {
                    return;
                }

                const link = document.createElement('a');

                link.className = 'tag-link';
                link.textContent = service;
                link.href = `work.html?filter=${encodeURIComponent(service)}`;

                serviceTags.appendChild(link);
            });
        }
    }

    const workPage = content.workPage || {};

    if (document.querySelector('.work-page-main')) {
        applyPageSeo(workPage.seo);

        setSiteText('.work-page-title', workPage.heading);

        replaceSiteParagraphs(
            document.querySelector('.work-page-description'),
            workPage.introParagraphs
        );

        setSiteText('.filter-toggle-label', workPage.browseLabel);

        setSiteText(
            '.filter-current-label',
            workPage.allWorkLabel
        );

        setSiteText(
            '.secret-call-title',
            workPage.calloutHeading
        );

        setSiteText(
            '.secret-call-cta',
            workPage.calloutButton
        );
    }

    const footer = content.footer || {};

    const isProjectPage = Boolean(
        document.querySelector('.project-page-main')
    );

    updateFooterTagline(
        isProjectPage ? footer.projectTagline : footer.tagline
    );

    updateFooterLinks(footer);
}
function sendVisualPreviewUpdate(path, value) {
    if (!currentSiteContent || !path) {
        return;
    }

    const parts = path.split('.');
    let target = currentSiteContent;

    for (let index = 0; index < parts.length - 1; index += 1) {
        if (
            !target[parts[index]] ||
            typeof target[parts[index]] !== 'object'
        ) {
            return;
        }

        target = target[parts[index]];
    }

    target[parts[parts.length - 1]] = value;

    window.parent.postMessage(
        {
            type: 'sada-site-content-preview-update',
            path,
            value
        },
        'https://admin.sadastudio.me'
    );
}

function makeVisualPreviewTextEditable(
    element,
    path,
    onChange
) {
    if (
        !element ||
        !path ||
        element.dataset.sadaEditable === 'true'
    ) {
        return;
    }

    element.dataset.sadaEditable = 'true';

    element.setAttribute(
        'contenteditable',
        'plaintext-only'
    );

    element.setAttribute('spellcheck', 'true');

    element.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
    });

    element.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            element.blur();
        }

        event.stopPropagation();
    });

    element.addEventListener('input', () => {
        const value = element.textContent.trim();

        sendVisualPreviewUpdate(path, value);

        if (typeof onChange === 'function') {
            onChange(value);
        }
    });
}

function makeVisualPreviewTextNodeEditable(node, path) {
    if (
        !node ||
        node.nodeType !== Node.TEXT_NODE ||
        !node.textContent.trim()
    ) {
        return;
    }

    const original = node.textContent;

    const leadingSpace =
        (original.match(/^\s*/) || [''])[0];

    const trailingSpace =
        (original.match(/\s*$/) || [''])[0];

    const editable = document.createElement('span');

    editable.textContent = original.trim();

    const replacement = document.createDocumentFragment();

    if (leadingSpace) {
        replacement.appendChild(
            document.createTextNode(leadingSpace)
        );
    }

    replacement.appendChild(editable);

    if (trailingSpace) {
        replacement.appendChild(
            document.createTextNode(trailingSpace)
        );
    }

    node.parentNode.replaceChild(replacement, node);

    makeVisualPreviewTextEditable(editable, path);
}

function installVisualPreviewStyles() {
    if (document.getElementById('sada-visual-preview-styles')) {
        return;
    }

    const style = document.createElement('style');

    style.id = 'sada-visual-preview-styles';

    style.textContent = `
        [data-sada-editable="true"] {
            cursor: text !important;
            outline: 1px dashed transparent;
            outline-offset: 5px;
            transition: outline-color 0.15s ease;
        }

        [data-sada-editable="true"]:hover {
            outline-color: rgba(245, 99, 153, 0.65);
        }

        [data-sada-editable="true"]:focus {
            outline: 2px solid #f56399;
            outline-offset: 5px;
        }
    `;

    document.head.appendChild(style);
}
function enableVisualHomepageEditing() {
    if (!document.querySelector('.hero-section')) {
        return;
    }

    makeVisualPreviewTextEditable(
        document.querySelector('.scroll-text'),
        'homepage.scrollLabel'
    );

    makeVisualPreviewTextEditable(
        document.querySelector('.work-heading .main-heading'),
        'homepage.featuredHeading'
    );

    makeVisualPreviewTextEditable(
        document.querySelector('.work-heading .tagline'),
        'homepage.featuredTagline'
    );

    const callToAction = document.querySelector(
        '.bottom-cta-text'
    );

    if (callToAction) {
        const textNodes = Array.from(
            callToAction.childNodes
        ).filter(node => {
            return (
                node.nodeType === Node.TEXT_NODE &&
                node.textContent.trim()
            );
        });

        makeVisualPreviewTextNodeEditable(
            textNodes[0],
            'homepage.callToAction.before'
        );

        makeVisualPreviewTextNodeEditable(
            textNodes[1],
            'homepage.callToAction.after'
        );

        makeVisualPreviewTextEditable(
            callToAction.querySelector('a span'),
            'homepage.callToAction.button'
        );
    }

    makeVisualPreviewTextEditable(
        document.querySelector('.about-text h2'),
        'homepage.aboutHeading'
    );

    document.querySelectorAll(
        '.about-text > p'
    ).forEach((paragraph, index) => {
        makeVisualPreviewTextEditable(
            paragraph,
            'homepage.aboutParagraphs.' + index
        );
    });

    document.querySelectorAll(
        '.about-service-tags a'
    ).forEach((service, index) => {
        makeVisualPreviewTextEditable(
            service,
            'homepage.services.' + index,
            value => {
                service.href =
                    'work.html?filter=' +
                    encodeURIComponent(value);
            }
        );
    });
}

function enableVisualWorkPageEditing() {
    if (!document.querySelector('.work-page-main')) {
        return;
    }

    makeVisualPreviewTextEditable(
        document.querySelector('.work-page-title'),
        'workPage.heading'
    );

    document.querySelectorAll(
        '.work-page-description > p'
    ).forEach((paragraph, index) => {
        makeVisualPreviewTextEditable(
            paragraph,
            'workPage.introParagraphs.' + index
        );
    });

    makeVisualPreviewTextEditable(
        document.querySelector('.filter-toggle-label'),
        'workPage.browseLabel'
    );

    makeVisualPreviewTextEditable(
        document.querySelector('.filter-current-label'),
        'workPage.allWorkLabel',
        value => {
            const allWorkChip = document.querySelector(
                '.filter-chip[data-filter-value="All"] ' +
                '.filter-chip-label'
            );

            if (allWorkChip) {
                allWorkChip.textContent = value;
            }
        }
    );

    makeVisualPreviewTextEditable(
        document.querySelector('.secret-call-title'),
        'workPage.calloutHeading'
    );

    makeVisualPreviewTextEditable(
        document.querySelector('.secret-call-cta'),
        'workPage.calloutButton'
    );
}
function enableVisualProjectPageEditing() {
    if (!document.querySelector('.project-page-main')) {
        return;
    }

    makeVisualPreviewTextEditable(
        document.querySelector('.see-all-work-btn span'),
        'projectPage.backLabel'
    );

    makeVisualPreviewTextEditable(
        document.querySelector('.not-found h1'),
        'projectPage.notFoundHeading'
    );

    makeVisualPreviewTextEditable(
        document.querySelector('.not-found p'),
        'projectPage.notFoundText'
    );

    makeVisualPreviewTextEditable(
        document.querySelector('.not-found a'),
        'projectPage.notFoundButton'
    );

    makeVisualPreviewTextEditable(
        document.querySelector('.project-gallery-empty'),
        'projectPage.emptyGalleryText'
    );
}

function enableVisualSharedEditing() {
    makeVisualPreviewTextEditable(
        document.querySelector('.menu-text'),
        'navigation.menuLabel'
    );

    document.querySelectorAll(
        '.nav-link-item'
    ).forEach(link => {
        const destination = link.getAttribute('href') || '';

        let path = '';

        if (destination === 'work.html') {
            path = 'navigation.workLabel';
        } else if (destination === '/' || destination === 'index.html') {
            path = 'navigation.homeLabel';
        } else if (destination.includes('#about')) {
            path = 'navigation.aboutLabel';
        } else if (destination === '#contact') {
            path = 'navigation.contactLabel';
        }

        if (path) {
            makeVisualPreviewTextEditable(link, path);
        }
    });

    const isProjectPage = Boolean(
        document.querySelector('.project-page-main')
    );

    const taglinePath = isProjectPage
        ? 'footer.projectTagline'
        : 'footer.tagline';

    const tagline = document.querySelector('.footer-tagline');

    if (tagline) {
        const nodes = Array.from(tagline.childNodes);

        const highlightIndex = nodes.findIndex(node => {
            return (
                node.nodeType === Node.ELEMENT_NODE &&
                node.classList.contains('sonar-word')
            );
        });

        nodes.forEach((node, index) => {
            if (
                node.nodeType !== Node.TEXT_NODE ||
                !node.textContent.trim()
            ) {
                return;
            }

            const section = index < highlightIndex
                ? 'before'
                : 'after';

            makeVisualPreviewTextNodeEditable(
                node,
                taglinePath + '.' + section
            );
        });

        makeVisualPreviewTextEditable(
            tagline.querySelector('.sonar-word strong'),
            taglinePath + '.highlight'
        );
    }

    const email = document.querySelector('.footer-email-link');

    makeVisualPreviewTextEditable(
        email,
        'footer.email',
        value => {
            email.href = 'mailto:' + value;
        }
    );

    document.querySelectorAll(
        '.footer-social-links a:not([href^="tel:"])'
    ).forEach((link, index) => {
        makeVisualPreviewTextEditable(
            link,
            'footer.socialLinks.' + index + '.label'
        );
    });

    makeVisualPreviewTextEditable(
        document.querySelector(
            '.footer-social-links a[href^="tel:"]'
        ),
        'footer.phone.label'
    );
}

function enableVisualWebsiteEditing() {
    const parameters = new URLSearchParams(
        window.location.search
    );

    const isPreview =
        parameters.get('cmsPreview') === '1' &&
        window.parent !== window;

    if (!isPreview || !currentSiteContent) {
        return;
    }

    installVisualPreviewStyles();

    enableVisualSharedEditing();
    enableVisualHomepageEditing();
    enableVisualWorkPageEditing();
    enableVisualProjectPageEditing();
}
    async function fetchProjects() {
    try {
        const response = await fetch('projects.json', {
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const projects = await response.json();

        if (!Array.isArray(projects)) {
            throw new Error('projects.json must contain an array of projects.');
        }

        return projects.filter(project =>
            project.visible !== false &&
            project.status !== 'draft'
        );
    } catch (error) {
        console.error("Could not fetch projects:", error);
        return null;
    }
}
    function getProjectLink(project) {
    const slug = String(project.slug || '').trim();

    if (slug) {
        return `project.html?slug=${encodeURIComponent(slug)}`;
    }

    return `project.html?id=${encodeURIComponent(project.id)}`;
}

function updateProjectMetadata(project) {
    const title = String(
        project.seoTitle || `${project.title} - Sada Studio`
    ).trim();

    const description = String(
        project.seoDescription ||
        project.description ||
        project.longDescription ||
        `Explore ${project.title} by Sada Studio.`
    )
        .replace(/\s+/g, ' ')
        .trim();

    const media = [
        project.thumbnail,
        ...(Array.isArray(project.images) ? project.images : [])
    ];

    const image = media.find(item => item && !isVideo(item)) ||
        'https://assets.sadastudio.me/site/web_logo.png';

    const pageUrl = new URL(
        getProjectLink(project),
        window.location.href
    ).href;

    document.title = title;

    const updateMeta = (selector, value) => {
        const element = document.head.querySelector(selector);

        if (element) {
            element.setAttribute('content', value);
        }
    };

    updateMeta('meta[name="description"]', description);
    updateMeta('meta[property="og:title"]', title);
    updateMeta('meta[property="og:description"]', description);
    updateMeta('meta[property="og:image"]', image);
    updateMeta('meta[property="og:url"]', pageUrl);
    updateMeta('meta[name="twitter:title"]', title);
    updateMeta('meta[name="twitter:description"]', description);
    updateMeta('meta[name="twitter:image"]', image);

    let canonical = document.head.querySelector('link[rel="canonical"]');

    if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
    }

    canonical.setAttribute('href', pageUrl);
}
    function populateFeaturedGrid(projects) {
        if (!featuredWorkGrid) return;
        const featuredProjects = projects.filter(p => p.featured);
        featuredWorkGrid.innerHTML = '';

        featuredProjects.forEach((project, index) => {
            const isLarge = index === 0 && featuredProjects.length % 2 === 1;
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
                <a class="work-item-link" href="${getProjectLink(project)}" aria-label="View ${project.title} project"></a>
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
            projectItem.href = getProjectLink(project);
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
    const requestedSlug = urlParams.get('slug');
    const requestedId = urlParams.get('id');

    const project = projects.find(item => {
        if (requestedSlug) {
            return String(item.slug || '') === requestedSlug;
        }

        if (requestedId) {
            return String(item.id || '') === requestedId;
        }

        return false;
    });

    if (project) {
        updateProjectMetadata(project);
            const tagsHTML = project.tags.map(tag => createFilterTagLink(tag)).join('');
            const galleryMedia = sanitizeMediaList(project.images).filter(
                mediaSrc => project.showCoverOnProject !== false ||
                    mediaSrc !== project.thumbnail
            );

            const imagesHTML = galleryMedia.map(mediaSrc => {
                if (isVideo(mediaSrc)) {
                    const videoType = /\.webm(?:[?#].*)?$/i.test(mediaSrc)
                        ? 'webm'
                        : 'mp4';

                    return `
                        <div class="project-gallery-media project-gallery-video" data-media-src="${mediaSrc}">
                            <video autoplay loop muted playsinline preload="metadata">
                                <source src="${mediaSrc}" type="video/${videoType}">
                            </video>
                            <button class="project-video-sound" type="button" aria-label="Turn video sound on" aria-pressed="false">
                                <svg class="project-video-sound-icon project-video-sound-icon-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <path d="M11 5 6 9H2v6h4l5 4V5Z"></path>
                                    <path d="m23 9-6 6m0-6 6 6"></path>
                                </svg>
                                <svg class="project-video-sound-icon project-video-sound-icon-audible" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <path d="M11 5 6 9H2v6h4l5 4V5Z"></path>
                                    <path d="M15.5 8.5a5 5 0 0 1 0 7"></path>
                                    <path d="M19 5a10 10 0 0 1 0 14"></path>
                                </svg>
                                <span class="project-video-sound-label">Sound on</span>
                            </button>
                        </div>`;
                } else {
                    return `
                        <div class="project-gallery-media" data-media-src="${mediaSrc}">
                            <img src="${mediaSrc}" alt="${project.title} gallery image" loading="lazy">
                        </div>`;
                }
            }).join('');

            projectDetailContainer.innerHTML = `
                <div class="project-info-wrapper">
                    <div class="project-details-column">
                        <h1>${project.title}</h1>

${project.year ? `
    <p class="project-year">${project.year}</p>
` : ''}

<p class="short-desc">${project.description}</p>
                        <div class="tags">${tagsHTML}</div>
                        <p class="long-desc">${project.longDescription || ''}</p>
                    </div>
                    <a href="work.html" class="btn see-all-work-btn"><span>← Back</span></a>
                </div>
                <div class="project-gallery-column">${imagesHTML}</div>
            `;

            const projectPageSettings =
    (currentSiteContent && currentSiteContent.projectPage) || {};

const backButtonLabel = projectDetailContainer.querySelector(
    '.see-all-work-btn span'
);

if (backButtonLabel && projectPageSettings.backLabel) {
    backButtonLabel.textContent = projectPageSettings.backLabel;
}

const galleryColumn = projectDetailContainer.querySelector(
    '.project-gallery-column'
);

const renderEmptyGallery = () => {
    if (!galleryColumn || galleryColumn.children.length) {
        return;
    }

    const emptyMessage = document.createElement('div');

    emptyMessage.className = 'project-gallery-empty';

    emptyMessage.textContent =
        projectPageSettings.emptyGalleryText ||
        'No gallery media available for this project yet.';

    galleryColumn.replaceChildren(emptyMessage);
};

renderEmptyGallery();

const removeBrokenMedia = (mediaWrapper) => {
    if (!mediaWrapper) {
        return;
    }

    mediaWrapper.remove();
    renderEmptyGallery();
};

            galleryColumn?.querySelectorAll('img').forEach((img) => {
                img.addEventListener('error', () => removeBrokenMedia(img.closest('.project-gallery-media')));
            });

            galleryColumn?.querySelectorAll('video').forEach((video) => {
                video.addEventListener('error', () => removeBrokenMedia(video.closest('.project-gallery-media')));

                const soundButton = video
                    .closest('.project-gallery-media')
                    ?.querySelector('.project-video-sound');

                if (!soundButton) {
                    return;
                }

                const updateSoundButton = () => {
                    const soundIsOn = !video.muted;
                    const label = soundIsOn ? 'Sound off' : 'Sound on';

                    soundButton.setAttribute('aria-pressed', String(soundIsOn));
                    soundButton.setAttribute(
                        'aria-label',
                        soundIsOn ? 'Turn video sound off' : 'Turn video sound on'
                    );

                    const soundLabel = soundButton.querySelector(
                        '.project-video-sound-label'
                    );

                    if (soundLabel) {
                        soundLabel.textContent = label;
                    }
                };

                video.addEventListener('volumechange', updateSoundButton);

                soundButton.addEventListener('click', async () => {
                    if (video.muted) {
                        galleryColumn.querySelectorAll('video').forEach((otherVideo) => {
                            if (otherVideo !== video) {
                                otherVideo.muted = true;
                            }
                        });

                        video.muted = false;

                        try {
                            await video.play();
                        } catch (error) {
                            video.muted = true;
                            console.warn('Could not play project video with sound:', error);
                        }
                    } else {
                        video.muted = true;
                    }

                    updateSoundButton();
                });

                updateSoundButton();
            });
        } else {
            projectDetailContainer.innerHTML = `
    <div class="not-found">
        <h1>Project Not Found</h1>
        <p>The project you are looking for does not exist.</p>
        <br>
        <a href="work.html" class="btn">View All Work</a>
    </div>
`;

const projectPageSettings =
    (currentSiteContent && currentSiteContent.projectPage) || {};

const missingHeading = projectDetailContainer.querySelector(
    '.not-found h1'
);

const missingMessage = projectDetailContainer.querySelector(
    '.not-found p'
);

const missingButton = projectDetailContainer.querySelector(
    '.not-found a'
);

if (missingHeading && projectPageSettings.notFoundHeading) {
    missingHeading.textContent =
        projectPageSettings.notFoundHeading;
}

if (missingMessage && projectPageSettings.notFoundText) {
    missingMessage.textContent =
        projectPageSettings.notFoundText;
}

if (missingButton && projectPageSettings.notFoundButton) {
    missingButton.textContent =
        projectPageSettings.notFoundButton;
}
        }
    }

    function setupWorkFilters(projects) {
        const filterToolbar = document.getElementById('work-filter-toolbar');
        const filterToggle = document.getElementById('work-filter-toggle');
        const filterPanel = document.getElementById('work-filter-panel');
        const currentLabel = document.getElementById('filter-current-label');
        const currentCount = document.getElementById('filter-current-count');
        if (!filterToolbar || !filterToggle || !filterPanel || !currentLabel || !currentCount || !workPageList) return;
const allWorkDisplayLabel =
    currentSiteContent &&
    currentSiteContent.workPage &&
    currentSiteContent.workPage.allWorkLabel
        ? currentSiteContent.workPage.allWorkLabel
        : 'All work';
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
                const chipLabel =
    normalized === 'all'
        ? allWorkDisplayLabel
        : label;
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
            currentLabel.textContent =
    isAll
        ? allWorkDisplayLabel
        : activeFilter;
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
        const canHoverPreview = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        let mouseX = 0, mouseY = 0;
        let lastMouseX = 0;
        let rotation = 0;
        let animationFrameId = null;

        const stopThumbnailAnimation = () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        };

        const hideThumbnailViewer = () => {
            thumbnailViewer.classList.remove('visible');
            thumbnailViewer.style.backgroundImage = '';
            stopThumbnailAnimation();
            rotation = 0;
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
            workPageList.addEventListener('touchstart', hideThumbnailViewer, { passive: true });
        }
    }

    // --- Main function to initialize pages ---
    async function initializePage() {
    const [projects, siteContent] = await Promise.all([
        fetchProjects(),
        fetchSiteContent()
    ]);

    if (siteContent) {
        applySiteContent(siteContent);
    }
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
        enableVisualWebsiteEditing();
    }

    initializePage();
});
