/**
 * PREHISTORIC DOMAIN - TIME TRAVEL GLOBE
 * Gestion de la popup de contenu
 */

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
      title: document.getElementById("popupTitle"),
      description: document.getElementById("popupDescription"),
      artist: document.getElementById("popupArtist"),
      tags: document.getElementById("popupTags"),
      tagsList: document.querySelector("#popupTags .popup-tags-list"),
      link: document.getElementById("popupLink"),
    };

    this.init();
  }

  init() {
    this.closeBtn.addEventListener("click", () => this.hide());

    // Info button to toggle overlay - using capture phase to intercept before stopPropagation
    document.addEventListener("click", (e) => {
      // Check if click is on info button or its children (SVG, span)
      const infoBtn = e.target.closest("#popupInfoBtn");
      if (infoBtn && this.popup.classList.contains("active")) {
        console.log("🔵 Info button clicked!");
        e.stopPropagation();
        if (this.infoOverlay) {
          this.infoOverlay.classList.toggle("active");
          infoBtn.classList.toggle("active");
          console.log("Overlay active:", this.infoOverlay.classList.contains("active"));
        }
      }
    }, true); // ← CAPTURE PHASE: intercept before bubbling

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
        if (!this.currentContent || !window.appController?.favoritesManager) return;

        window.appController.favoritesManager.toggle(this.currentContent.id);
        this.updateFavoriteButton(this.currentContent.id);
      });
    }
  }

  show(content) {
    // Store current content
    this.currentContent = content;

    // Update favorite button state
    this.updateFavoriteButton(content.id);

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
      this.elements.imageLink.parentNode.replaceChild(newImageLink, this.elements.imageLink);
      this.elements.imageLink = newImageLink;
      // Re-reference child elements after cloning
      this.elements.image = this.elements.imageLink.querySelector("img");
      this.elements.playIcon = this.elements.imageLink.querySelector(".popup-play-icon");
    }

    // Remplir les informations
    this.elements.title.textContent = content.title || "Sans titre";
    this.elements.description.textContent =
      content.description || "Pas de description disponible";

    // Artiste
    this.elements.artist.innerHTML = `${content.artist || "Inconnu"}`;

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
    const is3DTour = content.type === "3d" && content.pageUrl && content.pageUrl.includes("tour.prehistoricdomain.com");
    const isYouTubeVideo = content.type === "videos" && content.youtubeUrl;

    // Afficher iframe YouTube directement
    if (isYouTubeVideo) {
      const videoId = this.extractYouTubeId(content.youtubeUrl);
      if (videoId && this.elements.video) {
        this.elements.video.src = `https://www.youtube.com/embed/${videoId}`;
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
        this.elements.image.src = content.preview;
        this.elements.image.alt = content.title;
      }

      // Afficher l'icône play pour le contenu 3D
      if (this.elements.playIcon) {
        if (content.type === "3d") {
          this.elements.playIcon.style.display = "block";
        } else {
          this.elements.playIcon.style.display = "none";
        }
      }

      // Pour les tours 3D, intercepter le clic sur l'image pour charger l'iframe
      if (is3DTour && this.elements.imageLink) {
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

    // For 3D items, determine the appropriate link
    // If it's a 3D tour shown in iframe, link to Webflow page
    // Otherwise, use the pageUrl
    const webflowPageUrl = content.slug
      ? `https://www.prehistoricdomain.com/content/${content.slug}`
      : null;
    const linkUrl = is3DTour && webflowPageUrl
      ? webflowPageUrl
      : content.pageUrl;

    // Lien vers la page (nouvel onglet)
    if (linkUrl) {
      this.elements.link.href = linkUrl;
      this.elements.link.target = "_blank";
      this.elements.link.rel = "noopener noreferrer";
      // Only set imageLink if not showing iframe
      if (this.elements.imageLink && !is3DTour && !isYouTubeVideo) {
        this.elements.imageLink.href = linkUrl;
        this.elements.imageLink.target = "_blank";
        this.elements.imageLink.rel = "noopener noreferrer";
      }
    }

    // Afficher la popup
    this.popup.classList.add("active");
    this.backdrop.classList.add("active");
  }

  hide() {
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

  updateFavoriteButton(contentId) {
    if (!this.favoriteBtn || !window.appController?.favoritesManager) return;

    const isFavorite = window.appController.favoritesManager.isFavorite(contentId);
    const emptyIcon = this.favoriteBtn.querySelector(".favorite-icon-empty");
    const filledIcon = this.favoriteBtn.querySelector(".favorite-icon-filled");

    if (emptyIcon) emptyIcon.style.display = isFavorite ? "none" : "block";
    if (filledIcon) filledIcon.style.display = isFavorite ? "block" : "none";

    this.favoriteBtn.title = isFavorite ? "Remove from favorites" : "Add to favorites";
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
