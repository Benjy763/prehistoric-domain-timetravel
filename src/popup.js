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
    this.elements = {
      image: document.getElementById("popupImage"),
      imageLink: document.getElementById("popupImageLink"),
      playIcon: document.getElementById("popupPlayIcon"),
      video: document.getElementById("popupVideo"),
      title: document.getElementById("popupTitle"),
      description: document.getElementById("popupDescription"),
      artist: document.getElementById("popupArtist"),
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
  }

  show(content) {
    // Clear previous image to avoid flash of old content
    if (this.elements.image) {
      this.elements.image.src = "";
    }

    // Remplir les informations
    this.elements.title.textContent = content.title || "Sans titre";
    this.elements.description.textContent =
      content.description || "Pas de description disponible";

    // Artiste
    this.elements.artist.innerHTML = `${content.artist || "Inconnu"}`;

    // Afficher la vidéo YouTube embédée pour les vidéos
    if (content.type === "videos" && content.youtubeUrl) {
      const videoId = this.extractYouTubeId(content.youtubeUrl);
      if (videoId && this.elements.video) {
        this.elements.video.src = `https://www.youtube.com/embed/${videoId}`;
        this.elements.video.style.display = "block";
        if (this.elements.imageLink) {
          this.elements.imageLink.style.display = "none";
        }
      }
    } else {
      // Pour les images et contenus 3D, afficher l'image
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
    }

    // For 3D items, pageUrl is the tour URL — use slug to build the Webflow page URL
    const webflowPageUrl = content.slug
      ? `https://www.prehistoricdomain.com/content/${content.slug}`
      : null;
    const linkUrl =
      content.type === "3d" && webflowPageUrl
        ? webflowPageUrl
        : content.pageUrl;

    // Lien vers la page (nouvel onglet)
    if (linkUrl) {
      this.elements.link.href = linkUrl;
      this.elements.link.target = "_blank";
      this.elements.link.rel = "noopener noreferrer";
      if (this.elements.imageLink) {
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

    // Cacher l'overlay info et réinitialiser le bouton
    if (this.infoOverlay) {
      this.infoOverlay.classList.remove("active");
    }
    const infoBtn = document.getElementById("popupInfoBtn");
    if (infoBtn) {
      infoBtn.classList.remove("active");
    }

    // Arrêter la vidéo YouTube
    if (this.elements.video) {
      this.elements.video.src = "";
    }
  }

  extractYouTubeId(url) {
    if (!url) return null;

    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);

    return match && match[7].length === 11 ? match[7] : null;
  }
}
