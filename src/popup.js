/**
 * PREHISTORIC DOMAIN - TIME TRAVEL GLOBE
 * Gestion de la popup de contenu
 */

class PopupManager {
  constructor() {
    this.popup = document.getElementById("contentPopup");
    this.backdrop = document.getElementById("popupBackdrop");
    this.closeBtn = document.getElementById("popupClose");
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

    // Fermer en cliquant sur le backdrop
    if (this.backdrop) {
      this.backdrop.addEventListener("click", () => {
        console.log("Backdrop clicked!");
        this.hide();
      });
    } else {
      console.error("Backdrop element not found!");
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
    // Remplir les informations
    this.elements.title.textContent = content.title || "Sans titre";
    this.elements.description.textContent =
      content.description || "Pas de description disponible";

    // Artiste
    this.elements.artist.innerHTML = `<strong>Artiste:</strong> ${content.artist || "Inconnu"}`;

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

    // Lien vers la page (même onglet)
    if (content.pageUrl) {
      this.elements.link.href = content.pageUrl;
      if (this.elements.imageLink) {
        this.elements.imageLink.href = content.pageUrl;
      }
    }

    // Afficher la popup
    this.popup.classList.add("active");
    this.backdrop.classList.add("active");
  }

  hide() {
    this.popup.classList.remove("active");
    this.backdrop.classList.remove("active");
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
