/**
 * PREHISTORIC DOMAIN - TIME TRAVEL GLOBE
 * Gestion de la popup de contenu
 */

function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

class PopupManager {
  constructor() {
    this.popup = document.getElementById("contentPopup");
    this.backdrop = document.getElementById("popupBackdrop");
    this.closeBtn = document.getElementById("popupClose");
    this.infoBtn = document.getElementById("popupInfoBtn");
    this.infoOverlay = document.getElementById("popupInfoOverlay");
    this.favoriteBtn = document.getElementById("popupFavoriteBtn");
    this.currentContent = null; // Track current content for favorite toggle
    this.elements = {
      image: document.getElementById("popupImage"),
      imageLink: document.getElementById("popupImageLink"),
      playIcon: document.getElementById("popupPlayIcon"),
      video: document.getElementById("popupVideo"),
      mobileBlock: document.getElementById("popupMobileBlock"),
      title: document.getElementById("popupTitle"),
      description: document.getElementById("popupDescription"),
      artist: document.getElementById("popupArtist"),
      tags: document.getElementById("popupTags"),
      tagsList: document.querySelector("#popupTags .popup-tags-list"),
      credit: document.getElementById("popupCredit"),
      view: document.getElementById("popupViewLink"),
    };

    this.init();
  }

  init() {
    this.closeBtn.addEventListener("click", () => this.hide());

    // Info button to toggle overlay - using capture phase to intercept before stopPropagation
    document.addEventListener(
      "click",
      (e) => {
        // Check if click is on info button or its children (SVG, span)
        const infoBtn = e.target.closest("#popupInfoBtn");
        if (infoBtn && this.popup.classList.contains("active")) {
          console.log("🔵 Info button clicked!");
          e.stopPropagation();
          if (this.infoOverlay) {
            this.infoOverlay.classList.toggle("active");
            infoBtn.classList.toggle("active");
            console.log(
              "Overlay active:",
              this.infoOverlay.classList.contains("active"),
            );
          }
        }
      },
      true,
    ); // ← CAPTURE PHASE: intercept before bubbling

    // Fermer en cliquant sur le backdrop
    if (this.backdrop) {
      this.backdrop.addEventListener("click", () => {
        this.hide();
      });
    }

    // Empêcher la propagation du clic sur la popup elle-même
    this.popup.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // Fermer avec la touche Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.popup.classList.contains("active")) {
        this.hide();
      }
    });

    // Listen for access requests from 3D tour iframes
    window.addEventListener("message", (event) => {
      if (event.data === "getAccess") {
        console.log("🔑 Access request from 3D tour iframe");
        // Send access token to the iframe
        event.source.postMessage({ type: "v4j9kjxzwmjsrlnfbq2ndu68z" }, "*");
        console.log("✅ Access granted to 3D tour");
      }
    });

    // Favorite button toggle
    if (this.favoriteBtn) {
      this.favoriteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!this.currentContent || !window.appController?.favoritesManager)
          return;

        window.appController.favoritesManager.toggle(this.currentContent.slug);
        this.updateFavoriteButton(this.currentContent.slug);
      });
    }
  }

  show(content) {
    // Store current content
    this.currentContent = content;
    // Back to the default frame until the picture says its shape
    this.popup.style.width = "";
    this.popup.style.height = "";
    this.popup.classList.toggle("is-picture", content.type === "images");
    // A YouTube video shows its own title in the top left: the name goes lower
    this.popup.classList.toggle("is-video", content.type === "videos" && Boolean(content.youtubeUrl));

    // Update favorite button state
    this.updateFavoriteButton(content.slug);

    // Pause ambient audio with fade when opening video/3D content
    const isVideoOr3D = content.type === "videos" || content.type === "3d";
    if (isVideoOr3D && window.appController?.audioManager) {
      window.appController.audioManager.pause();
    }

    // Clear previous image to avoid flash of old content
    if (this.elements.image) {
      this.elements.image.src = "";
    }

    // IMPORTANT: Remove ALL previous event listeners by cloning imageLink
    // This prevents old 3D tour listeners from interfering with new content
    if (this.elements.imageLink) {
      const newImageLink = this.elements.imageLink.cloneNode(true);
      this.elements.imageLink.parentNode.replaceChild(
        newImageLink,
        this.elements.imageLink,
      );
      this.elements.imageLink = newImageLink;
      // Re-reference child elements after cloning
      this.elements.image = this.elements.imageLink.querySelector("img");
      this.elements.playIcon =
        this.elements.imageLink.querySelector(".popup-play-icon");
    }

    // Remplir les informations
    this.elements.title.textContent = content.title || "Sans titre";
    this.elements.description.textContent =
      content.description || "Pas de description disponible";

    // Artiste
    this.elements.artist.textContent = content.artist || "";
    const name = window.artistNameOf?.(content);
    this.elements.credit.textContent = name ? `by ${name}` : "";
    this.elements.credit.hidden = !name;
    // The artist's page on the site, for an artist's piece (an apprentice's key starts with m-)
    const site = this.siteOrigin(content);
    const artistPage =
      site && content.owner && !content.owner.startsWith("m-")
        ? `${site}/artist/${encodeURIComponent(content.owner)}`
        : null;
    if (artistPage) {
      this.elements.credit.setAttribute("href", artistPage);
    } else {
      this.elements.credit.removeAttribute("href");
    }
    // The piece's own page on the site
    if (this.elements.view) {
      this.elements.view.hidden = !content.sitePageUrl;
      if (content.sitePageUrl) this.elements.view.href = content.sitePageUrl;
    }

    // Free Tags
    if (content.freeTags && content.freeTags.trim()) {
      const tags = content.freeTags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      if (tags.length > 0 && this.elements.tagsList) {
        this.elements.tagsList.innerHTML = tags
          .map((tag) => `<span class="popup-tag">${tag}</span>`)
          .join("");
        if (this.elements.tags) {
          this.elements.tags.style.display = "block";
        }
      } else {
        if (this.elements.tags) {
          this.elements.tags.style.display = "none";
        }
      }
    } else {
      if (this.elements.tags) {
        this.elements.tags.style.display = "none";
      }
    }

    // Déterminer le type de contenu à afficher
    const is3DTour =
      content.type === "3d" &&
      content.pageUrl &&
      content.pageUrl.includes("prehistoric-domain-vr.pages.dev");
    const isYouTubeVideo = content.type === "videos" && content.youtubeUrl;
    const isImmersiveOnMobile = content.type === "3d" && isMobile();

    // Hide mobile block by default
    if (this.elements.mobileBlock) {
      this.elements.mobileBlock.style.display = "none";
    }

    // Afficher iframe YouTube directement
    if (isYouTubeVideo) {
      const videoId = this.extractYouTubeId(content.youtubeUrl);
      if (videoId && this.elements.video) {
        // Privacy-enhanced mode: no YouTube cookies (pd-web privacy policy)
        this.elements.video.src = `https://www.youtube-nocookie.com/embed/${videoId}`;
        this.elements.video.style.display = "block";
        if (this.elements.imageLink) {
          this.elements.imageLink.style.display = "none";
        }
      }
    } else {
      // Pour les images et contenus 3D, afficher l'image avec play icon
      if (this.elements.video) {
        this.elements.video.style.display = "none";
      }
      if (this.elements.imageLink) {
        this.elements.imageLink.style.display = "block";
      }

      if (content.preview && this.elements.image) {
        const image = this.elements.image;
        image.onload = null;
        image.src = content.preview;
        image.alt = content.title;
      }

      // Afficher l'icône play pour le contenu 3D
      if (this.elements.playIcon) {
        if (content.type === "3d") {
          this.elements.playIcon.style.display = "block";
        } else {
          this.elements.playIcon.style.display = "none";
        }
      }

      // Block immersive content on mobile
      if (isImmersiveOnMobile && this.elements.mobileBlock) {
        this.elements.mobileBlock.style.display = "flex";
        if (this.elements.playIcon) {
          this.elements.playIcon.style.display = "none";
        }
      }

      // Pour les tours 3D, intercepter le clic sur l'image pour charger l'iframe (desktop only)
      if (is3DTour && !isImmersiveOnMobile && this.elements.imageLink) {
        this.elements.imageLink.addEventListener("click", (e) => {
          e.preventDefault();
          console.log("🎮 Loading 3D tour in iframe:", content.pageUrl);

          // Hide image and show iframe
          this.elements.imageLink.style.display = "none";
          if (this.elements.video) {
            this.elements.video.src = content.pageUrl;
            this.elements.video.style.display = "block";
          }
        });
      }
    }

    // A picture: the window opens straight at the picture's own shape (nothing
    // cropped, no resize once open), as soon as its size is known
    if (content.type === "images" && content.preview) {
      this.openWhenSized(content.preview);
      return;
    }
    this.open();
  }

  open() {
    this.popup.classList.add("active");
    this.backdrop.classList.add("active");
  }

  /** Reads the picture's size first (a cached file answers at once), then opens. */
  openWhenSized(src) {
    const shown = this.currentContent;
    let opened = false;
    const go = (width, height) => {
      // Too late, or another piece was chosen meanwhile
      if (opened || this.currentContent !== shown) return;
      opened = true;
      if (width && height) this.fitTo(width, height);
      this.open();
    };
    this.backdrop.classList.add("active");
    const probe = new Image();
    probe.onload = () => go(probe.naturalWidth, probe.naturalHeight);
    probe.onerror = () => go(0, 0);
    probe.src = src;
    // A slow network: open in the default frame rather than wait
    setTimeout(() => go(0, 0), 1200);
  }

  hide() {
    // A picture still being measured must not open after closing
    this.currentContent = null;
    this.popup.classList.remove("active");
    this.backdrop.classList.remove("active");

    // Resume ambient audio with fade when closing popup
    if (window.appController?.audioManager) {
      window.appController.audioManager.resume();
    }

    // Cacher l'overlay info et réinitialiser le bouton
    if (this.infoOverlay) {
      this.infoOverlay.classList.remove("active");
    }
    const infoBtn = document.getElementById("popupInfoBtn");
    if (infoBtn) {
      infoBtn.classList.remove("active");
    }

    // Arrêter la vidéo/iframe et réinitialiser les états d'affichage
    if (this.elements.video) {
      this.elements.video.src = "";
      this.elements.video.style.display = "none";
    }
    if (this.elements.imageLink) {
      this.elements.imageLink.style.display = "block";
    }
    if (this.elements.playIcon) {
      this.elements.playIcon.style.display = "none";
    }
  }

  /**
   * Fits the window to a picture: as large as the screen allows, with the
   * picture's own proportions (portrait, landscape or square).
   */
  fitTo(width, height) {
    if (!width || !height) return;
    const ratio = width / height;
    const maxWidth = Math.min(window.innerWidth * 0.92, 1100);
    const maxHeight = window.innerHeight * 0.8;
    const fitted = Math.min(maxWidth, maxHeight * ratio);
    this.popup.style.width = `${Math.round(fitted)}px`;
    this.popup.style.height = `${Math.round(fitted / ratio)}px`;
  }

  /** The site's address, from the piece's page on it. */
  siteOrigin(content) {
    try {
      return content.sitePageUrl ? new URL(content.sitePageUrl).origin : null;
    } catch {
      return null;
    }
  }

  /** Called when the favorites change (the site answered): the heart follows. */
  refreshFavorite() {
    if (this.currentContent) this.updateFavoriteButton(this.currentContent.slug);
  }

  updateFavoriteButton(slug) {
    if (!this.favoriteBtn || !window.appController?.favoritesManager) return;

    const manager = window.appController.favoritesManager;
    // No heart for a visitor: favorites belong to a member's account
    this.favoriteBtn.hidden = !manager.isAvailable();
    const isFavorite = manager.isFavorite(slug);
    this.favoriteBtn.setAttribute("aria-pressed", String(isFavorite));
    this.favoriteBtn.setAttribute(
      "aria-label",
      isFavorite ? "Remove from favorites" : "Add to favorites",
    );
    const emptyIcon = this.favoriteBtn.querySelector(".favorite-icon-empty");
    const filledIcon = this.favoriteBtn.querySelector(".favorite-icon-filled");

    if (emptyIcon) emptyIcon.style.display = isFavorite ? "none" : "block";
    if (filledIcon) filledIcon.style.display = isFavorite ? "block" : "none";

    this.favoriteBtn.title = isFavorite
      ? "Remove from favorites"
      : "Add to favorites";
  }

  extractYouTubeId(url) {
    if (!url) return null;

    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);

    return match && match[7].length === 11 ? match[7] : null;
  }
}

window.PopupManager = PopupManager;
