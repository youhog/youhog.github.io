import { createRoot } from "@wordpress/element";
import ReactPlayer from "react-player";

const AdvancedVideo = (props) => {
    const { wrapper, _autoplay, _muted } = props;

    let url = wrapper.getAttribute("data-url");
    let controls = wrapper.getAttribute("data-controls") === "true" ? true : false;
    let loop = wrapper.getAttribute("data-loop") === "true" ? true : false;
    let muted = _muted ? _muted : wrapper.getAttribute("data-muted") === "true" ? true : false;
    let autoplay = _autoplay ? _autoplay : wrapper.getAttribute("data-playing") === "true" ? true : false;
    let imageOverlay = wrapper.getAttribute("data-overlay") === "true" ? true : false;
    let previewImage = wrapper.getAttribute("data-light");
    let customPlayIcon = wrapper.getAttribute("data-customPlayIcon") === "true" ? true : false;
    let customPlayIconURL = wrapper.getAttribute("data-playicon");
    let customPlayIconType = wrapper.getAttribute("data-customPlayIconType");
    let customPlayIconLib = wrapper.getAttribute("data-customPlayIconLib");
    let download = wrapper.getAttribute("data-download");

    let preview;
    if (imageOverlay === true && previewImage) {
        preview = previewImage;
    } else {
        preview = false;
    }

    let videoPlayIcon;
    if (imageOverlay == true && customPlayIcon == true && customPlayIconType == "image") {
        videoPlayIcon = <img src={customPlayIconURL} />;
    } else if (imageOverlay == true && customPlayIcon == true && customPlayIconType == "icon") {
        videoPlayIcon = <i class={customPlayIconLib}></i>;
    } else {
        videoPlayIcon = null;
    }

    // Check if video is in lightbox mode
    const isLightbox = wrapper.closest('.lightbox') !== null;

    // Player configuration for different video providers
    const playerConfig = {
        file: {
            attributes: {
                controlsList: download === "false" ? "nodownload" : "",
                playsInline: !isLightbox,
                webkitPlaysinline: !isLightbox ? "true" : undefined,
                playsinline: !isLightbox ? "true" : undefined,
            },
        },
        youtube: {
            playerVars: {
                playsinline: !isLightbox ? 1 : 0,
                modestbranding: 1,
                origin: window.location.origin,
            },
        },
        vimeo: {
            playerOptions: {
                playsinline: !isLightbox,
                dnt: true,
            },
        },
    };

    return (
        <>
            <ReactPlayer
                className="eb-react-player"
                width="100%"
                height={isLightbox ? "100%" : "auto"}
                url={url}
                controls={controls}
                loop={loop}
                muted={muted}
                playing={autoplay}
                light={preview}
                playIcon={videoPlayIcon}
                volume={0.5}
                config={playerConfig}
                playsinline={!isLightbox}
                style={{
                    aspectRatio: isLightbox ? 'unset' : '16/9',
                }}
            />
        </>
    );
};

document.addEventListener("DOMContentLoaded", () => {
    const advVideoWrappers = document.getElementsByClassName(`eb-advanced-video-wrapper`);
    for (let advVideoWrapper of advVideoWrappers) {
        console.log('advVideoWrapper', advVideoWrapper);

        let playerOptions = advVideoWrapper.getElementsByClassName("eb-player-option");
        let playerOption = playerOptions[0];
        let imageOverlay = playerOption.getAttribute("data-overlay") === "true" ? true : false;

        // sticky
        let option = playerOption.getAttribute("data-option");

        if (imageOverlay) {
            playerOption.addEventListener("click", () => {
                const root = createRoot(playerOption);
                root.render(<AdvancedVideo wrapper={playerOption} _autoplay={true} _muted={false} />);
            });
        }

        const root = createRoot(playerOption);
        root.render(<AdvancedVideo wrapper={playerOption} />);

        if (option === "eb-sticky") {
            var $video = document.querySelector(".eb-player-option.eb-sticky");

            // Wait for React component to render before getting height
            setTimeout(() => {
                var reactPlayer = document.querySelector(".eb-react-player");
                if (!reactPlayer) {
                    console.warn("React player element not found");
                    return;
                }
                var height = reactPlayer.offsetHeight;
                var parent = playerOption.closest(".eb-sticky").closest(".wp-block-essential-blocks-advanced-video")
                    .offsetTop;

                // close button
                var closeBtnEl = playerOption.querySelector(".eb-sticky-video-close");
                var closeSpan = document.createElement("span");
                closeSpan.innerHTML = "&times;";
                closeSpan.setAttribute("class", "eb-sticky-video-close");

                let lastScroll = 0;
                // let isSticky = false;
                let stickyState = 'none'; // 'none', 'stuck', 'stuck-out'

                const stickyVisibility = playerOption.getAttribute("data-stickyVisibility");
                const stickyVisibilityTAB = playerOption.getAttribute("data-stickyVisibilityTAB");
                const stickyVisibilityMOB = playerOption.getAttribute("data-stickyVisibilityMOB");

                // Determine which device we're on and if sticky should be enabled
                let shouldEnableSticky = false;
                if (window.matchMedia("(min-width: 1025px)").matches && stickyVisibility != "hidden") {
                    shouldEnableSticky = true;
                } else if (window.matchMedia("(min-width: 768px) and (max-width: 1024px)").matches && stickyVisibilityTAB != "hidden") {
                    shouldEnableSticky = true;
                } else if (window.matchMedia("(max-width: 767px)").matches && stickyVisibilityMOB != "hidden") {
                    shouldEnableSticky = true;
                }

                if (shouldEnableSticky) {
                    // Single scroll event listener with unified logic
                    const handleScroll = function () {
                        const videoThreshold = height + parent + 320;
                        const currentScroll = window.pageYOffset;

                        // Reset sticky state when scrolled back to top
                        if (currentScroll < height + parent + 200) {

                            if (stickyState !== 'none') {
                                $video.classList.remove("stuck", "stuck-out");
                                stickyState = 'none';
                                // isSticky = false;
                                closeSpan.style.display = "none";
                            }

                            return;
                        }

                        // Make video sticky when scrolled past threshold
                        if (currentScroll > videoThreshold && stickyState !== 'stuck') {
                            console.log('second');
                            $video.classList.remove("stuck-out");
                            $video.classList.add("stuck");
                            stickyState = 'stuck';
                            // isSticky = true;

                            if (closeBtnEl == null) {
                                $video.prepend(closeSpan);
                            }
                            closeSpan.style.display = "inline";

                            // Add close button click handler once
                            if (!closeSpan.hasAttribute('data-listener-added')) {
                                closeSpan.addEventListener("click", function () {
                                    $video.classList.remove("eb-sticky");
                                    stickyState = 'none';
                                    // isSticky = false;
                                });
                                closeSpan.setAttribute('data-listener-added', 'true');
                            }
                        }

                        lastScroll = currentScroll;
                    };

                    document.addEventListener("scroll", handleScroll);
                }
            }, 100); // Close setTimeout with 100ms delay
        }

        if (advVideoWrapper.classList.contains("lightbox")) {
            const lightbox = advVideoWrapper.getAttribute("data-id");
            const lightboxWrapper = document.querySelector(`[data-id="${lightbox}"]`);

            let btnId = "#myBtn-" + lightbox;

            // Get the button that opens the modal
            var btn = lightboxWrapper.querySelector(btnId);

            // Get the <span> element that closes the modal
            var span = lightboxWrapper.getElementsByClassName("eb-modal-close")[0];

            // When the user clicks the button, open the modal
            btn.onclick = function () {
                const btnId = this.id;
                const wrapperId = btnId.substring(6);
                const wrapperModalId = "#eb-modal-" + wrapperId;
                const wrapperModal = document.querySelector(wrapperModalId);
                const modalLightbox = wrapperModal.getElementsByClassName("lightbox")[0];
                const modalAutoplay = modalLightbox.getAttribute("data-autoplay");

                wrapperModal.style.display = "block";

                if (modalAutoplay === "true") {
                    const modalRoot = createRoot(playerOption);
                    modalRoot.render(<AdvancedVideo wrapper={playerOption} _autoplay={true} _muted={false} />);
                }
            };

            // When the user clicks on <span> (x), close the modal
            span.onclick = function () {
                const spanId = this.id;
                const wrapperId = spanId.substring(6);
                const wrapperModalId = "#eb-modal-" + wrapperId;

                var wrapperModal = document.querySelector(wrapperModalId);

                wrapperModal.style.display = "none";
                const spanRoot = createRoot(playerOption);
                spanRoot.render(<AdvancedVideo wrapper={playerOption} _autoplay={false} />);
            };

            // When the user clicks anywhere outside of the modal, close it
            window.onclick = function (event) {
                if (event.target.classList.contains("eb-modal-player")) {
                    var wrapperModal = document.getElementById(event.target.id);
                    wrapperModal.style.display = "none";
                    const windowRoot = createRoot(playerOption);
                    windowRoot.render(<AdvancedVideo wrapper={playerOption} _autoplay={false} />);
                }
            };
        }
    }
});
