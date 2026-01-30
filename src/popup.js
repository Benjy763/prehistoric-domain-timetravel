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
      videoIcon: document.getElementById("popupVideoIcon"),
      title: document.getElementById("popupTitle"),
      description: document.getElementById("popupDescription"),
      artist: document.getElementById("popupArtist"),
      period: document.getElementById("popupPeriod"),
      type: document.getElementById("popupType"),
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

    // Période
    this.elements.period.innerHTML = `<strong>Période:</strong> ${content.period || "Non spécifié"}`;

    // Type
    const typeLabels = {
      videos: "Vidéo",
      images: "Image",
      "3d": "Immersion 3D",
      texts: "Texte",
    };
    this.elements.type.innerHTML = `<strong>Type:</strong> ${typeLabels[content.type] || content.type}`;

    // Image preview
    if (content.preview) {
      this.elements.image.src = content.preview;
      this.elements.image.alt = content.title;
    }

    // Icône vidéo pour les vidéos YouTube
    if (content.type === "videos" && content.youtubeUrl) {
      this.elements.videoIcon.classList.add("visible");
      // Utiliser la miniature YouTube si disponible
      const videoId = this.extractYouTubeId(content.youtubeUrl);
      if (videoId) {
        this.elements.image.src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    } else {
      this.elements.videoIcon.classList.remove("visible");
    }

    // Lien vers la page
    if (content.pageUrl) {
      this.elements.link.href = content.pageUrl;
    }

    // Afficher la popup
    this.popup.classList.add("active");
    this.backdrop.classList.add("active");
  }

  hide() {
    this.popup.classList.remove("active");
    this.backdrop.classList.remove("active");
  }

  extractYouTubeId(url) {
    if (!url) return null;

    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);

    return match && match[7].length === 11 ? match[7] : null;
  }
}
